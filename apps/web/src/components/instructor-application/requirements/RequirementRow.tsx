// @file: apps/web/src/components/instructor-application/requirements/RequirementRow.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { apiFetch } from "@/lib/api";
import { toUserFriendlyRequirementSaveErrorFromUnknown } from "@/lib/upload-utils";
import { RequirementAttachments } from "@/components/instructor-application/requirements/RequirementAttachments";
import { AttachmentReadonlyList } from "@/components/instructor-application/attachments/AttachmentReadonlyList";
import type { RequirementRowResponse } from "@hss/schemas";
import type { FlushRegistry } from "@/components/instructor-application/requirements/requirement-form.types";

const REQUIREMENT_SAVE_DEBOUNCE_MS = 500;
const REQUIREMENT_TEXT_MAX_LENGTH = 5000;

type Props = {
  applicationId: string;
  req: RequirementRowResponse;
  readOnly?: boolean;
  flushRegistry: FlushRegistry;
};

export function RequirementRow({ applicationId, req, readOnly, flushRegistry }: Props) {
  const t = useTranslations("applications");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pendingRef = useRef<{ state: string; actionDescription: string; verificationText?: string | null } | null>(null);
  const [state, setState] = useState<string>(req.state);
  const [actionDescription, setActionDescription] = useState<string>(req.actionDescription);
  const [verificationText, setVerificationText] = useState<string>(req.verificationText ?? "");
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const endpoint = `instructor-applications/${applicationId}/requirements/${req.uuid}`;

  const persistPayload = useCallback(
    async (payload: {
      state: string;
      actionDescription: string;
      verificationText?: string | null;
    }) => {
      try {
        await apiFetch(endpoint, { method: "PATCH", body: JSON.stringify(payload) });
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
  }, [req.actionDescription, req.state, req.verificationText]);

  useEffect(() => {
    return () => {
      clearTimeout(debounceRef.current);
      pendingRef.current = null;
    };
  }, [persistPayload]);

  const flush = useCallback(async () => {
    clearTimeout(debounceRef.current);
    if (pendingRef.current) {
      const payload = pendingRef.current;
      pendingRef.current = null;
      await persistPayload(payload);
    }
  }, [persistPayload]);

  useEffect(() => {
    const registryMap = flushRegistry.current;
    registryMap.set(req.uuid, flush);
    return () => {
      registryMap.delete(req.uuid);
      void flush();
    };
  }, [req.uuid, flush, flushRegistry]);

  const save = useCallback(
    (newState: string, actionDescription: string, verificationText?: string | null) => {
      if (readOnly) return;
      if (newState === "DONE" && (!verificationText || !verificationText.trim())) {
        setVerificationError(t("messages.verificationTextError"));
        return;
      }
      setVerificationError(null);
      setSaveError(null);
      const payload = { state: newState, actionDescription, verificationText };
      pendingRef.current = payload;
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        pendingRef.current = null;
        void persistPayload(payload).catch(() => undefined);
      }, REQUIREMENT_SAVE_DEBOUNCE_MS);
    },
    [readOnly, persistPayload, t],
  );

  const attachments = req.attachments ?? [];

  return (
    <div className="rounded border border-border/50 p-3">
      <p className="mb-2 text-sm">
        <span className="font-medium">{req.definition.code}.</span>{" "}
        {req.definition.description}
      </p>
      {!readOnly ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <select
              value={state}
              onChange={(event) => {
                const newState = event.target.value;
                setState(newState);
                save(newState, actionDescription, verificationText || null);
              }}
              className="rounded border border-border bg-background px-2 py-1 text-sm"
            >
              <option value="PLANNED">{t("requirementState.PLANNED")}</option>
              <option value="DONE">{t("requirementState.DONE")}</option>
            </select>
          </div>

          {saveError && <p className="text-xs text-red-600 dark:text-red-400">{saveError}</p>}

          <textarea
            value={actionDescription}
            placeholder={t("requirements.actionPlaceholder")}
            onChange={(event) => setActionDescription(event.target.value)}
            onBlur={() => save(state, actionDescription, verificationText || null)}
            rows={2}
            maxLength={REQUIREMENT_TEXT_MAX_LENGTH}
            className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
          />

          {state === "PLANNED" ? (
            <div>
              <label className="mb-1 block text-xs text-foreground/60">
                {t("requirements.futureProofLabel")}
              </label>
              <textarea
                value={verificationText}
                placeholder={t("requirements.futureProofPlaceholder")}
                onChange={(event) => setVerificationText(event.target.value)}
                onBlur={() => save(state, actionDescription, verificationText || null)}
                rows={1}
                maxLength={REQUIREMENT_TEXT_MAX_LENGTH}
                className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <div>
                <label className="mb-1 block text-xs text-foreground/60">
                  {t("verificationTextRequired")}
                </label>
                <textarea
                  value={verificationText}
                  placeholder={t("requirements.verificationPlaceholder")}
                  onChange={(event) => setVerificationText(event.target.value)}
                  onBlur={() => save(state, actionDescription, verificationText || null)}
                  rows={1}
                  required
                  maxLength={REQUIREMENT_TEXT_MAX_LENGTH}
                  className={`w-full rounded border bg-background px-2 py-1 text-sm ${
                    verificationError ? "border-red-500" : "border-border"
                  }`}
                />
                {verificationError && (
                  <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">{verificationError}</p>
                )}
              </div>
              <RequirementAttachments
                applicationId={applicationId}
                requirementUuid={req.uuid}
                initialAttachments={attachments}
              />
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