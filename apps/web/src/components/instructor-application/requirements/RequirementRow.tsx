// @file: apps/web/src/components/instructor-application/requirements/RequirementRow.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { apiFetch } from "@/lib/api";
import { toUserFriendlyRequirementSaveErrorFromUnknown } from "@/lib/upload-utils";
import { RequirementAttachments } from "@/components/instructor-application/requirements/RequirementAttachments";
import { AttachmentReadonlyList } from "@/components/instructor-application/attachments/AttachmentReadonlyList";
import {
  ChangeStatusBadge,
  InlineChangeSummary,
  type ChangeSummary,
} from "@/components/instructor-application/ui/ChangeSummary";
import {
  isOptionalInstructorRequirement,
  type RequirementRowResponse,
} from "@hss/schemas";
import {
  RequirementValidationError,
  type FlushRegistry,
  type RequirementFlushOptions,
} from "@/components/instructor-application/requirements/requirement-form.types";

const REQUIREMENT_SAVE_DEBOUNCE_MS = 500;
const REQUIREMENT_TEXT_MAX_LENGTH = 5000;

function isBlank(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0;
}

function getActionFieldName(code: string): string {
  return `requirement_${code}_actionDescription`;
}

function getVerificationFieldName(code: string): string {
  return `requirement_${code}_verificationText`;
}

function combineChangeSummaries(
  ...summaries: Array<ChangeSummary | undefined>
): ChangeSummary | undefined {
  const definedSummaries = summaries.filter(
    (summary): summary is ChangeSummary => !!summary,
  );

  if (definedSummaries.length === 0) {
    return undefined;
  }

  if (definedSummaries.length === 1) {
    return definedSummaries[0];
  }

  return {
    isChanged: definedSummaries.every((summary) => summary.isChanged),
  };
}

type Props = {
  applicationId: string;
  degreeCode: string;
  req: RequirementRowResponse;
  readOnly?: boolean;
  attachmentsReadOnly?: boolean;
  flushRegistry: FlushRegistry;
  onDraftChange?: (
    requirementUuid: string,
    requirementDraft: {
      state: string;
      actionDescription: string;
      verificationText: string;
    },
  ) => void;
  changeSummary?: ChangeSummary;
  attachmentChangeSummary?: ChangeSummary;
  onAttachmentsChange?: (
    requirementUuid: string,
    attachments: NonNullable<RequirementRowResponse["attachments"]>,
  ) => void;
};

export function RequirementRow({
  applicationId,
  degreeCode,
  req,
  readOnly,
  attachmentsReadOnly,
  flushRegistry,
  onDraftChange,
  changeSummary,
  attachmentChangeSummary,
  onAttachmentsChange,
}: Props) {
  const t = useTranslations("applications");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pendingRef = useRef<{ state: string; actionDescription: string; verificationText: string } | null>(null);
  const [state, setState] = useState<string>(req.state);
  const [actionDescription, setActionDescription] = useState<string>(req.actionDescription);
  const [verificationText, setVerificationText] = useState<string>(req.verificationText ?? "");
  const [actionDescriptionError, setActionDescriptionError] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const endpoint = `instructor-applications/${applicationId}/requirements/${req.uuid}`;
  const actionFieldName = getActionFieldName(req.definition.code);
  const verificationFieldName = getVerificationFieldName(req.definition.code);
  const isOptionalRequirement = isOptionalInstructorRequirement(
    degreeCode,
    req.definition.code,
  );
  const attachments = req.attachments ?? [];
  const combinedChangeSummary = combineChangeSummaries(
    changeSummary,
    attachmentChangeSummary,
  );
  const canEditRequirementText = !readOnly;
  const canEditRequirementAttachments = !attachmentsReadOnly;
  const canEditAnyPart = canEditRequirementText || canEditRequirementAttachments;

  const persistPayload = useCallback(
    async (
      payload: {
        state: string;
        actionDescription: string;
        verificationText: string;
      },
      options?: { keepalive?: boolean },
    ) => {
      try {
        await apiFetch(endpoint, {
          method: "PATCH",
          body: JSON.stringify(payload),
          ...(options?.keepalive ? { keepalive: true } : {}),
        });
        setSaveError(null);
      } catch (error: unknown) {
        setSaveError(toUserFriendlyRequirementSaveErrorFromUnknown(error, t));
        throw error;
      }
    },
    [endpoint, t],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(req.state);
    setActionDescription(req.actionDescription);
    setVerificationText(req.verificationText ?? "");
    setActionDescriptionError(null);
    setVerificationError(null);
  }, [req.actionDescription, req.state, req.verificationText]);

  useEffect(() => {
    onDraftChange?.(req.uuid, {
      state,
      actionDescription,
      verificationText,
    });
  }, [actionDescription, onDraftChange, req.uuid, state, verificationText]);

  useEffect(() => {
    return () => {
      clearTimeout(debounceRef.current);
      pendingRef.current = null;
    };
  }, [persistPayload]);

  const ensureRequirementIsValid = useCallback(() => {
    if (isOptionalRequirement) {
      setActionDescriptionError(null);
      setVerificationError(null);
      return;
    }

    const actionIsMissing = isBlank(actionDescription);
    const verificationIsMissing = isBlank(verificationText);

    if (actionIsMissing || verificationIsMissing) {
      const actionMessage = actionIsMissing ? t("messages.actionDescriptionError") : null;
      const verificationMessage = verificationIsMissing ? t("messages.verificationTextError") : null;

      setActionDescriptionError(actionMessage);
      setVerificationError(verificationMessage);

      if (actionMessage) {
        throw new RequirementValidationError(
          actionMessage,
          actionFieldName,
        );
      }

      if (verificationMessage) {
        throw new RequirementValidationError(
          verificationMessage,
          verificationFieldName,
        );
      }
    }

    setActionDescriptionError(null);
    setVerificationError(null);
  }, [
    actionDescription,
    actionFieldName,
    isOptionalRequirement,
    verificationFieldName,
    verificationText,
    t,
  ]);

  const flush = useCallback(
    async (options: RequirementFlushOptions = {}) => {
      if (!canEditRequirementText) {
        return;
      }

      const mode = options.mode ?? "strict";
      clearTimeout(debounceRef.current);

      const hasLocalChanges =
        state !== req.state ||
        actionDescription !== req.actionDescription ||
        verificationText !== (req.verificationText ?? "");

      const payload = pendingRef.current ?? {
        state,
        actionDescription,
        verificationText,
      };

      if (mode === "strict") {
        ensureRequirementIsValid();
      } else if (
        !isOptionalRequirement &&
        (isBlank(actionDescription) || isBlank(verificationText))
      ) {
        pendingRef.current = null;
        return;
      } else {
        setActionDescriptionError(null);
        setVerificationError(null);
      }

      if (!pendingRef.current && !hasLocalChanges) {
        return;
      }

      pendingRef.current = null;
      const keepalive = mode === "lenient";
      await persistPayload(payload, { keepalive });
    },
    [
      actionDescription,
      ensureRequirementIsValid,
      persistPayload,
      req.actionDescription,
      req.state,
      req.verificationText,
      state,
      isOptionalRequirement,
      canEditRequirementText,
      verificationText,
    ],
  );

  useEffect(() => {
    const registryMap = flushRegistry.current;
    registryMap.set(req.uuid, flush);
    return () => {
      registryMap.delete(req.uuid);
      if (canEditRequirementText) {
        void flush({ mode: "lenient" }).catch(() => undefined);
      }
    };
  }, [canEditRequirementText, flush, flushRegistry, req.uuid]);

  const save = useCallback(
    (newState: string, nextActionDescription: string, nextVerificationText: string) => {
      if (!canEditRequirementText) return;
      setSaveError(null);
      const payload = {
        state: newState,
        actionDescription: nextActionDescription,
        verificationText: nextVerificationText,
      };
      pendingRef.current = payload;
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        pendingRef.current = null;
        void persistPayload(payload).catch(() => undefined);
      }, REQUIREMENT_SAVE_DEBOUNCE_MS);
    },
    [canEditRequirementText, persistPayload],
  );

  return (
    <div
      data-fix-target={`requirement:${req.uuid}`}
      tabIndex={-1}
      className="scroll-mt-32 rounded border border-border/50 p-3 outline-none"
    >
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm">
          <span className="font-medium">{req.definition.code}.</span>{" "}
          {req.definition.description}
        </p>
        <ChangeStatusBadge changeSummary={combinedChangeSummary} />
      </div>
      <InlineChangeSummary changeSummary={changeSummary} />
      {canEditAnyPart ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <select
              value={state}
              onChange={(event) => {
                  const newState = event.target.value;
                  setState(newState);
                  save(newState, actionDescription, verificationText);
                }}
              disabled={!canEditRequirementText}
              className="rounded border border-border bg-background px-2 py-1 text-sm"
            >
              <option value="PLANNED">{t("requirementState.PLANNED")}</option>
              <option value="DONE">{t("requirementState.DONE")}</option>
            </select>
          </div>

          {saveError && <p className="text-xs text-red-600 dark:text-red-400">{saveError}</p>}

          <textarea
            data-field={actionFieldName}
            value={actionDescription}
            placeholder={t("requirements.actionPlaceholder")}
            onChange={(event) => {
              const value = event.target.value;
              setActionDescription(value);
              if (!isBlank(value)) {
                setActionDescriptionError(null);
              }
            }}
            onBlur={() => save(state, actionDescription, verificationText)}
            rows={2}
            maxLength={REQUIREMENT_TEXT_MAX_LENGTH}
            disabled={!canEditRequirementText}
            className={`w-full rounded border bg-background px-2 py-1 text-sm disabled:cursor-not-allowed disabled:border-border/70 disabled:bg-muted/40 disabled:text-foreground/70 disabled:opacity-100 ${
              actionDescriptionError ? "border-red-500" : "border-border"
            }`}
          />
          {actionDescriptionError && (
            <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">{actionDescriptionError}</p>
          )}

          {state === "PLANNED" ? (
            <div>
              <label className="mb-1 block text-xs text-foreground/60">
                {t("requirements.futureProofLabel")}
                {!isOptionalRequirement ? " *" : ""}
              </label>
              <textarea
                data-field={verificationFieldName}
                value={verificationText}
                placeholder={t("requirements.futureProofPlaceholder")}
                onChange={(event) => {
                  const value = event.target.value;
                  setVerificationText(value);
                  if (!isBlank(value)) {
                    setVerificationError(null);
                  }
                }}
                onBlur={() => save(state, actionDescription, verificationText)}
                rows={1}
                maxLength={REQUIREMENT_TEXT_MAX_LENGTH}
                disabled={!canEditRequirementText}
                className={`w-full rounded border bg-background px-2 py-1 text-sm disabled:cursor-not-allowed disabled:border-border/70 disabled:bg-muted/40 disabled:text-foreground/70 disabled:opacity-100 ${
                  verificationError ? "border-red-500" : "border-border"
                }`}
              />
              {verificationError && (
                <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">{verificationError}</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div>
                {!isOptionalRequirement && (
                  <label className="mb-1 block text-xs text-foreground/60">
                    {t("verificationTextRequired")}
                  </label>
                )}
                <textarea
                  data-field={verificationFieldName}
                  value={verificationText}
                  placeholder={t("requirements.verificationPlaceholder")}
                  onChange={(event) => {
                    const value = event.target.value;
                    setVerificationText(value);
                    if (!isBlank(value)) {
                      setVerificationError(null);
                    }
                  }}
                  onBlur={() => save(state, actionDescription, verificationText)}
                  rows={1}
                  maxLength={REQUIREMENT_TEXT_MAX_LENGTH}
                  disabled={!canEditRequirementText}
                  className={`w-full rounded border bg-background px-2 py-1 text-sm disabled:cursor-not-allowed disabled:border-border/70 disabled:bg-muted/40 disabled:text-foreground/70 disabled:opacity-100 ${
                    verificationError ? "border-red-500" : "border-border"
                  }`}
                />
                {verificationError && (
                  <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">{verificationError}</p>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-foreground/60">
                    {t("candidateEditScope.requirementAttachmentsLabel")}
                  </p>
                  <ChangeStatusBadge changeSummary={attachmentChangeSummary} />
                </div>
                <InlineChangeSummary changeSummary={attachmentChangeSummary} />
                <RequirementAttachments
                  applicationId={applicationId}
                  requirementUuid={req.uuid}
                  initialAttachments={attachments}
                  readOnly={!canEditRequirementAttachments}
                  onAttachmentsChange={onAttachmentsChange}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <span
              className={`rounded px-2 py-0.5 text-xs font-medium ${
                req.state === "DONE"
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
              }`}
            >
              {req.state === "DONE" ? t("requirementState.DONE") : t("requirementState.PLANNED")}
            </span>
            {req.actionDescription && <p className="text-foreground/70">{req.actionDescription}</p>}
          </div>
          {req.verificationText && <p className="text-xs text-foreground/50">{req.verificationText}</p>}
          {attachments.length > 0 && (
            <AttachmentReadonlyList
              applicationId={applicationId}
              attachments={attachments}
              variant="compact"
            />
          )}
        </div>
      )}
    </div>
  );
}
