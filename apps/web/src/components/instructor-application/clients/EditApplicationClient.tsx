// @file: apps/web/src/components/instructor-application/clients/EditApplicationClient.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { apiFetchValidated } from "@/lib/api";
import { degreeKey, scoutRankKey } from "@/lib/applications-i18n";
import { getFieldLabel } from "@/lib/instructor-application-fields";
import { AttachmentUpload } from "@/components/instructor-application/attachments/AttachmentUpload";
import { useEditApplicationNavigation } from "@/components/instructor-application/hooks/useEditApplicationNavigation";
import { RequirementForm } from "@/components/instructor-application/requirements/RequirementForm";
import { CandidateFixesPanel } from "@/components/instructor-application/revision/CandidateFixesPanel";
import {
  CANDIDATE_FIX_STEPS,
  buildCandidateFixTargets,
  type CandidateFixTarget,
} from "@/components/instructor-application/revision/candidate-fix-targets";
import { type ChangeSummary } from "@/components/instructor-application/ui/ChangeSummary";
import { SubmitApplicationButton } from "@/components/instructor-application/ui/SubmitApplicationButton";
import { StepBasicInfo } from "@/components/instructor-application/steps/StepBasicInfo";
import { StepServiceHistory } from "@/components/instructor-application/steps/StepServiceHistory";
import { StepSupervisor } from "@/components/instructor-application/steps/StepSupervisor";
import { StepNav } from "@/components/instructor-application/steps/shared";
import {
  canEditInstructorApplicationField,
  canEditInstructorHufcowyPresenceAttachment,
  canEditInstructorRequirement,
  canEditInstructorRequirementAttachments,
  canEditInstructorTopLevelAttachments,
  instructorApplicationCandidateRevisionActivityResponseSchema,
  type EditableInstructorApplicationField,
  type InstructorApplicationDetail,
  type RequirementRowResponse,
} from "@hss/schemas";

type Props = { initialApp: InstructorApplicationDetail; id: string };

type TranslateFn = (
  key: string,
  values?: Record<string, string | number>,
) => string;

type RequirementDraftState = {
  state: string;
  actionDescription: string;
  verificationText: string;
};

type AttachmentLike = Pick<
  InstructorApplicationDetail["attachments"][number],
  "uuid" | "originalFilename"
>;

function normalizeComparableValue(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function displayValueOrDash(value: string | null | undefined): string {
  const normalized = normalizeComparableValue(value);
  return normalized.length > 0 ? normalized : "—";
}

function describeAttachmentSet(attachments: readonly AttachmentLike[]): string {
  if (attachments.length === 0) {
    return "—";
  }

  return attachments
    .map((attachment) => attachment.originalFilename)
    .join(", ");
}

function buildAttachmentSetChangeSummary(
  initialAttachments: readonly AttachmentLike[],
  currentAttachments: readonly AttachmentLike[],
): ChangeSummary {
  const initialKey = initialAttachments
    .map((attachment) => attachment.uuid)
    .sort()
    .join("|");
  const currentKey = currentAttachments
    .map((attachment) => attachment.uuid)
    .sort()
    .join("|");

  return {
    isChanged: initialKey !== currentKey,
    beforeValue: describeAttachmentSet(initialAttachments),
    afterValue: describeAttachmentSet(currentAttachments),
  };
}

function isActionableCandidateFixTarget(target: CandidateFixTarget): boolean {
  switch (target.annotation.anchorType) {
    case "FIELD":
    case "REQUIREMENT":
    case "ATTACHMENT":
      return true;
    case "SECTION":
      return target.annotation.anchorKey === "GENERAL_ATTACHMENTS";
    default:
      return false;
  }
}

function formatFieldValue(
  field: EditableInstructorApplicationField,
  app: InstructorApplicationDetail,
  t: TranslateFn,
): string {
  const value = app[field];

  if (typeof value !== "string") {
    return value == null ? "—" : String(value);
  }

  if (field === "openTrialForRank") {
    const translationKey = scoutRankKey(value);
    return translationKey ? t(translationKey) : value;
  }

  if (field === "hufcowyPresence") {
    return value.length > 0 ? t(`presence.${value}`) : "—";
  }

  if (field === "supervisorInstructorRank") {
    const translationKey = degreeKey(value);
    return translationKey ? t(translationKey) : value;
  }

  return displayValueOrDash(value);
}

function formatRequirementDraftValue(
  requirementDraft: RequirementDraftState,
  t: TranslateFn,
): string {
  const parts = [
    requirementDraft.state === "DONE"
      ? t("requirementState.DONE")
      : t("requirementState.PLANNED"),
    normalizeComparableValue(requirementDraft.actionDescription),
    normalizeComparableValue(requirementDraft.verificationText),
  ].filter((value) => value.length > 0);

  return parts.length > 0 ? parts.join(" / ") : "—";
}

function getRequirementDraftState(
  requirement: RequirementRowResponse | undefined,
): RequirementDraftState | null {
  if (!requirement) {
    return null;
  }

  return {
    state: requirement.state,
    actionDescription: requirement.actionDescription,
    verificationText: requirement.verificationText ?? "",
  };
}

function areRequirementDraftsEqual(
  left: RequirementDraftState | null,
  right: RequirementDraftState | null,
): boolean {
  if (!left || !right) {
    return left === right;
  }

  return (
    left.state === right.state &&
    normalizeComparableValue(left.actionDescription) ===
      normalizeComparableValue(right.actionDescription) &&
    normalizeComparableValue(left.verificationText) ===
      normalizeComparableValue(right.verificationText)
  );
}

function findRequirementByAttachmentUuid(
  app: InstructorApplicationDetail,
  attachmentUuid: string,
): RequirementRowResponse | undefined {
  return app.requirements.find((requirement) =>
    (requirement.attachments ?? []).some(
      (attachment) => attachment.uuid === attachmentUuid,
    ),
  );
}

function buildFixProgressByTargetId(
  currentApp: InstructorApplicationDetail,
  initialApp: InstructorApplicationDetail,
  fixTargets: ReturnType<typeof buildCandidateFixTargets>,
  requirementDraftsByUuid: Record<string, RequirementDraftState>,
  t: TranslateFn,
): Record<string, ChangeSummary> {
  const currentGeneralAttachments = currentApp.attachments.filter(
    (attachment) =>
      attachment.uuid !== currentApp.hufcowyPresenceAttachmentUuid,
  );
  const initialGeneralAttachments = initialApp.attachments.filter(
    (attachment) =>
      attachment.uuid !== initialApp.hufcowyPresenceAttachmentUuid,
  );
  const currentHufcowyAttachments = currentApp.hufcowyPresenceAttachmentUuid
    ? currentApp.attachments.filter(
        (attachment) =>
          attachment.uuid === currentApp.hufcowyPresenceAttachmentUuid,
      )
    : [];
  const initialHufcowyAttachments = initialApp.hufcowyPresenceAttachmentUuid
    ? initialApp.attachments.filter(
        (attachment) =>
          attachment.uuid === initialApp.hufcowyPresenceAttachmentUuid,
      )
    : [];

  const progressByTargetId = fixTargets.reduce<Record<string, ChangeSummary>>(
    (progressMap, target) => {
      const progressId = target.progressId ?? target.targetId;

      if (!progressId) {
        return progressMap;
      }

      if (target.annotation.anchorType === "FIELD") {
        const field = target.annotation
          .anchorKey as EditableInstructorApplicationField;
        const beforeValue = formatFieldValue(field, initialApp, t);
        const afterValue = formatFieldValue(field, currentApp, t);
        const beforeRawValue = normalizeComparableValue(
          initialApp[field] as string | null | undefined,
        );
        const afterRawValue = normalizeComparableValue(
          currentApp[field] as string | null | undefined,
        );

        progressMap[progressId] = {
          isChanged: beforeRawValue !== afterRawValue,
          beforeValue,
          afterValue,
        };
        return progressMap;
      }

      if (target.annotation.anchorType === "SECTION") {
        if (target.annotation.anchorKey === "GENERAL_ATTACHMENTS") {
          progressMap[progressId] = buildAttachmentSetChangeSummary(
            initialGeneralAttachments,
            currentGeneralAttachments,
          );
          return progressMap;
        }
        progressMap[progressId] = {
          isChanged: false,
        };
        return progressMap;
      }

      if (target.annotation.anchorType === "REQUIREMENT") {
        const baselineRequirement = initialApp.requirements.find(
          (requirement) => requirement.uuid === target.annotation.anchorKey,
        );
        const baselineRequirementDraft =
          getRequirementDraftState(baselineRequirement);
        const liveRequirementDraft =
          requirementDraftsByUuid[target.annotation.anchorKey] ??
          getRequirementDraftState(
            currentApp.requirements.find(
              (requirement) => requirement.uuid === target.annotation.anchorKey,
            ),
          );

        progressMap[progressId] = {
          isChanged: !areRequirementDraftsEqual(
            baselineRequirementDraft,
            liveRequirementDraft,
          ),
          beforeValue: baselineRequirementDraft
            ? formatRequirementDraftValue(baselineRequirementDraft, t)
            : undefined,
          afterValue: liveRequirementDraft
            ? formatRequirementDraftValue(liveRequirementDraft, t)
            : undefined,
        };
        return progressMap;
      }

      if (target.annotation.anchorType === "ATTACHMENT") {
        const requirementNow = findRequirementByAttachmentUuid(
          currentApp,
          target.annotation.anchorKey,
        );
        const requirementInitially = findRequirementByAttachmentUuid(
          initialApp,
          target.annotation.anchorKey,
        );

        if (requirementNow || requirementInitially) {
          progressMap[progressId] = buildAttachmentSetChangeSummary(
            requirementInitially?.attachments ?? [],
            requirementNow?.attachments ?? [],
          );
          return progressMap;
        }

        if (
          target.annotation.anchorKey ===
            currentApp.hufcowyPresenceAttachmentUuid ||
          target.annotation.anchorKey ===
            initialApp.hufcowyPresenceAttachmentUuid
        ) {
          progressMap[progressId] = buildAttachmentSetChangeSummary(
            initialHufcowyAttachments,
            currentHufcowyAttachments,
          );
          return progressMap;
        }

        progressMap[progressId] = buildAttachmentSetChangeSummary(
          initialGeneralAttachments,
          currentGeneralAttachments,
        );
        return progressMap;
      }

      return progressMap;
    },
    {},
  );

  const hasAnyChanged = Object.entries(progressByTargetId).some(
    ([targetId, progress]) =>
      targetId !== "general-annotations" && progress.isChanged,
  );

  for (const target of fixTargets) {
    if (
      target.annotation.anchorType === "SECTION" &&
      target.annotation.anchorKey !== "GENERAL_ATTACHMENTS" &&
      target.targetId
    ) {
      progressByTargetId[target.targetId] = {
        isChanged: fixTargets.some((candidateTarget) => {
          if (
            candidateTarget.annotation.anchorType === "SECTION" ||
            candidateTarget.annotation.anchorType === "APPLICATION" ||
            !(candidateTarget.progressId ?? candidateTarget.targetId) ||
            candidateTarget.stepIndex !== target.stepIndex
          ) {
            return false;
          }

          const candidateProgressId =
            candidateTarget.progressId ?? candidateTarget.targetId;
          if (!candidateProgressId) {
            return false;
          }

          return progressByTargetId[candidateProgressId]?.isChanged === true;
        }),
      };
      continue;
    }

    if (target.annotation.anchorType !== "APPLICATION" || !target.targetId) {
      continue;
    }

    progressByTargetId[target.targetId] = {
      isChanged: hasAnyChanged,
    };
  }

  return progressByTargetId;
}

export function EditApplicationClient({ initialApp, id }: Props) {
  const t = useTranslations("applications");
  const {
    app,
    isSaving,
    navigationMissingFields,
    navigationError,
    step,
    updateDraft,
    persistDraftPatch,
    replaceHufcowyPresenceAttachments,
    replaceTopLevelAttachments,
    replaceRequirementAttachments,
    requirementFlushRef,
    navigateTo,
  } = useEditApplicationNavigation({ initialApp, id });
  const [initialSnapshot] = useState(() => initialApp);
  const [requirementDraftsByUuid, setRequirementDraftsByUuid] = useState<
    Record<string, RequirementDraftState>
  >({});

  const translatedDegreeKey = degreeKey(app.template.degreeCode);
  const degreeTitle = translatedDegreeKey
    ? t(translatedDegreeKey)
    : app.template.degreeCode;
  const isLimitedFixScope =
    app.status === "TO_FIX" && app.candidateEditScope.mode === "LIMITED";
  const canEditTopLevelAttachments = canEditInstructorTopLevelAttachments(
    app.candidateEditScope,
  );
  const hufcowyAttachments = app.hufcowyPresenceAttachmentUuid
    ? app.attachments.filter(
        (attachment) => attachment.uuid === app.hufcowyPresenceAttachmentUuid,
      )
    : [];
  const initialHufcowyAttachments =
    initialSnapshot.hufcowyPresenceAttachmentUuid
      ? initialSnapshot.attachments.filter(
          (attachment) =>
            attachment.uuid === initialSnapshot.hufcowyPresenceAttachmentUuid,
        )
      : [];
  const generalAttachments = app.attachments.filter(
    (attachment) => attachment.uuid !== app.hufcowyPresenceAttachmentUuid,
  );
  const initialGeneralAttachments = initialSnapshot.attachments.filter(
    (attachment) =>
      attachment.uuid !== initialSnapshot.hufcowyPresenceAttachmentUuid,
  );
  const trackedGeneralAttachmentUuids = new Set([
    ...generalAttachments.map((attachment) => attachment.uuid),
    ...initialGeneralAttachments.map((attachment) => attachment.uuid),
  ]);
  const fixTargets = buildCandidateFixTargets(app, initialSnapshot, t);
  const actionableFixTargets = fixTargets.filter(
    isActionableCandidateFixTarget,
  );
  const fixCountsByStep = CANDIDATE_FIX_STEPS.map(
    (_, stepIndex) =>
      actionableFixTargets.filter((target) => target.stepIndex === stepIndex)
        .length,
  );
  const fixProgressByTargetId = buildFixProgressByTargetId(
    app,
    initialSnapshot,
    fixTargets,
    requirementDraftsByUuid,
    t,
  );
  const fixChangedCountsByStep = CANDIDATE_FIX_STEPS.map(
    (_, stepIndex) =>
      actionableFixTargets.filter((target) => {
        if (
          target.isGeneral ||
          target.stepIndex !== stepIndex ||
          !target.targetId
        ) {
          return false;
        }

        return (
          fixProgressByTargetId[target.progressId ?? target.targetId]
            ?.isChanged === true
        );
      }).length,
  );
  const initialRequirementAttachmentOwnerByUuid = new Map(
    initialSnapshot.requirements.flatMap((requirement) =>
      (requirement.attachments ?? []).map(
        (attachment) => [attachment.uuid, requirement.uuid] as const,
      ),
    ),
  );
  const currentRequirementAttachmentOwnerByUuid = new Map(
    app.requirements.flatMap((requirement) =>
      (requirement.attachments ?? []).map(
        (attachment) => [attachment.uuid, requirement.uuid] as const,
      ),
    ),
  );
  const requirementAttachmentTargetUuids = new Set<string>();
  let hasHufcowyPresenceAttachmentFix = false;

  for (const target of fixTargets) {
    if (target.annotation.anchorType !== "ATTACHMENT") {
      continue;
    }

    const attachmentUuid = target.annotation.anchorKey;
    const requirementUuid =
      currentRequirementAttachmentOwnerByUuid.get(attachmentUuid) ??
      initialRequirementAttachmentOwnerByUuid.get(attachmentUuid) ??
      null;

    if (requirementUuid) {
      requirementAttachmentTargetUuids.add(requirementUuid);
      continue;
    }

    if (
      attachmentUuid === app.hufcowyPresenceAttachmentUuid ||
      attachmentUuid === initialSnapshot.hufcowyPresenceAttachmentUuid
    ) {
      hasHufcowyPresenceAttachmentFix = true;
    }
  }
  const summaryAttachmentTargets = fixTargets.filter(
    (target) =>
      (target.annotation.anchorType === "ATTACHMENT" &&
        trackedGeneralAttachmentUuids.has(target.annotation.anchorKey)) ||
      (target.annotation.anchorType === "SECTION" &&
        target.annotation.anchorKey === "GENERAL_ATTACHMENTS"),
  );
  const fieldChangeByField = fixTargets.reduce<
    Partial<Record<EditableInstructorApplicationField, ChangeSummary>>
  >((fieldMap, target) => {
    if (target.annotation.anchorType !== "FIELD" || !target.targetId) {
      return fieldMap;
    }

    const progress = fixProgressByTargetId[target.targetId];

    if (progress) {
      fieldMap[
        target.annotation.anchorKey as EditableInstructorApplicationField
      ] = progress;
    }

    return fieldMap;
  }, {});
  const requirementChangeByUuid = fixTargets.reduce<
    Record<string, ChangeSummary>
  >((requirementMap, target) => {
    if (target.annotation.anchorType !== "REQUIREMENT" || !target.targetId) {
      return requirementMap;
    }

    const progress = fixProgressByTargetId[target.targetId];

    if (progress) {
      requirementMap[target.annotation.anchorKey] = progress;
    }

    return requirementMap;
  }, {});
  const requirementAttachmentChangeByUuid = app.requirements.reduce<
    Record<string, ChangeSummary>
  >((attachmentMap, requirement) => {
    if (!requirementAttachmentTargetUuids.has(requirement.uuid)) {
      return attachmentMap;
    }

    const initialRequirement = initialSnapshot.requirements.find(
      (candidateRequirement) => candidateRequirement.uuid === requirement.uuid,
    );

    attachmentMap[requirement.uuid] = buildAttachmentSetChangeSummary(
      initialRequirement?.attachments ?? [],
      requirement.attachments ?? [],
    );
    return attachmentMap;
  }, {});
  const hufcowyPresenceAttachmentChangeSummary = hasHufcowyPresenceAttachmentFix
    ? buildAttachmentSetChangeSummary(
        initialHufcowyAttachments,
        hufcowyAttachments,
      )
    : undefined;
  const pendingFixLabels = Array.from(
    new Set(
      actionableFixTargets
        .filter((target) => {
          const progressId = target.progressId ?? target.targetId;

          return !!progressId && !fixProgressByTargetId[progressId]?.isChanged;
        })
        .map((target) =>
          target.context ? `${target.label}. ${target.context}` : target.label,
        ),
    ),
  );
  const handleRequirementDraftChange = useCallback(
    (requirementUuid: string, requirementDraft: RequirementDraftState) => {
      setRequirementDraftsByUuid((previousDrafts) => {
        const previousDraft = previousDrafts[requirementUuid] ?? null;

        if (areRequirementDraftsEqual(previousDraft, requirementDraft)) {
          return previousDrafts;
        }

        return {
          ...previousDrafts,
          [requirementUuid]: requirementDraft,
        };
      });
    },
    [],
  );
  const handleBeforeHufcowyPresenceUpload =
    app.hufcowyPresence === "ATTACHMENT_OPINION"
      ? async () => {
          await persistDraftPatch({
            hufcowyPresence: "ATTACHMENT_OPINION",
          });
        }
      : undefined;

  useEffect(() => {
    if (
      app.status !== "TO_FIX" ||
      !app.candidateEditScope.requestUuid ||
      app.candidateEditScope.candidateFirstViewedAt
    ) {
      return;
    }

    void apiFetchValidated(
      instructorApplicationCandidateRevisionActivityResponseSchema,
      `instructor-applications/${id}/revision-request/viewed`,
      {
        method: "POST",
      },
    ).catch(() => {
      // UX remains functional even if telemetry recording fails.
    });
  }, [
    app.candidateEditScope.candidateFirstViewedAt,
    app.candidateEditScope.requestUuid,
    app.status,
    id,
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">{degreeTitle}</h1>

      {/* Step indicator */}
      <div className="mb-6 flex gap-1">
        {CANDIDATE_FIX_STEPS.map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              void navigateTo(i);
            }}
            className={`flex flex-1 items-center justify-center rounded-sm px-2 py-1 text-xs transition ${
              i === step
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground/60 hover:bg-muted/80"
            }`}
          >
            <span>{t(`steps.${s}`)}</span>
            {fixCountsByStep[i] > 0 ? (
              <span
                className={`ml-2 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${
                  fixChangedCountsByStep[i] === 0
                    ? "border-amber-400/40 bg-amber-500/10 text-amber-800 dark:text-amber-200"
                    : fixChangedCountsByStep[i] === fixCountsByStep[i]
                      ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                      : "border-sky-300/40 bg-sky-500/10 text-sky-800 dark:text-sky-200"
                }`}
              >
                {fixChangedCountsByStep[i] > 0
                  ? `${fixChangedCountsByStep[i]}/${fixCountsByStep[i]}`
                  : fixCountsByStep[i]}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {app.status === "TO_FIX" && (
        <div className="mb-6 space-y-4">
          {!isLimitedFixScope ? (
            <section className="rounded-2xl border border-border bg-background/90 p-4">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground/80">
                {t("candidateEditScope.title")}
              </p>
              <p className="mt-2 text-sm text-foreground/75">
                {t("candidateEditScope.everythingEditable")}
              </p>
              {app.candidateEditScope.candidateMessage ? (
                <div className="mt-4 rounded-2xl border border-border/70 bg-muted/10 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-foreground/55">
                    {t("candidateEditScope.messageLabel")}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground/80">
                    {app.candidateEditScope.candidateMessage}
                  </p>
                </div>
              ) : null}
            </section>
          ) : null}

          {isLimitedFixScope && fixTargets.length > 0 ? (
            <CandidateFixesPanel
              activeStep={step}
              targets={fixTargets}
              progressByTargetId={fixProgressByTargetId}
              onOpenTarget={(target) => {
                void navigateTo(target.stepIndex, {
                  focusTargetId: target.targetId,
                  skipCompletionValidation: true,
                });
              }}
            />
          ) : null}
        </div>
      )}

      {navigationMissingFields.length > 0 && (
        <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-700 dark:bg-red-950/30">
          <p className="mb-2 text-sm font-medium text-red-800 dark:text-red-300">
            {t("messages.incompleteCurrentStep")}
          </p>
          <ul className="ml-4 list-disc text-sm text-red-700 dark:text-red-400">
            {navigationMissingFields.map((field) => (
              <li key={field}>{getFieldLabel(field, t, app.requirements)}</li>
            ))}
          </ul>
        </div>
      )}

      {navigationError && (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-700 dark:bg-red-950/30 dark:text-red-300"
        >
          {navigationError}
        </div>
      )}

      {/* Step content */}
      {step === 0 && (
        <StepBasicInfo
          app={app}
          updateDraft={updateDraft}
          fieldChangeByField={fieldChangeByField}
          hufcowyPresenceAttachmentChangeSummary={
            hufcowyPresenceAttachmentChangeSummary
          }
          canEditHufcowyPresenceAttachment={canEditInstructorHufcowyPresenceAttachment(
            app.candidateEditScope,
          )}
          canEditField={(field) =>
            canEditInstructorApplicationField(app.candidateEditScope, field)
          }
          onHufcowyPresenceAttachmentsChange={replaceHufcowyPresenceAttachments}
          onBeforeHufcowyPresenceUpload={handleBeforeHufcowyPresenceUpload}
          onNext={() => {
            void navigateTo(1);
          }}
        />
      )}
      {step === 1 && (
        <StepServiceHistory
          app={app}
          updateDraft={updateDraft}
          fieldChangeByField={fieldChangeByField}
          canEditField={(field) =>
            canEditInstructorApplicationField(app.candidateEditScope, field)
          }
          onNext={() => {
            void navigateTo(2);
          }}
          onPrev={() => {
            void navigateTo(0);
          }}
        />
      )}
      {step === 2 && (
        <StepSupervisor
          app={app}
          updateDraft={updateDraft}
          fieldChangeByField={fieldChangeByField}
          canEditField={(field) =>
            canEditInstructorApplicationField(app.candidateEditScope, field)
          }
          onNext={() => {
            void navigateTo(3);
          }}
          onPrev={() => {
            void navigateTo(1);
          }}
        />
      )}
      {step === 3 && (
        <div>
          <RequirementForm
            applicationId={id}
            degreeCode={app.template.degreeCode}
            requirements={app.requirements}
            groupDefinitions={app.template.groupDefinitions}
            isRequirementReadOnly={(requirementUuid) =>
              !canEditInstructorRequirement(
                app.candidateEditScope,
                requirementUuid,
              )
            }
            isRequirementAttachmentsReadOnly={(requirementUuid) =>
              !canEditInstructorRequirementAttachments(
                app.candidateEditScope,
                requirementUuid,
              )
            }
            flushRef={requirementFlushRef}
            changeSummaryByRequirementUuid={requirementChangeByUuid}
            attachmentChangeSummaryByRequirementUuid={
              requirementAttachmentChangeByUuid
            }
            onRequirementDraftChange={handleRequirementDraftChange}
            onRequirementAttachmentsChange={replaceRequirementAttachments}
          />
          <StepNav
            onPrev={() => {
              void navigateTo(2);
            }}
            onNext={() => {
              void navigateTo(4);
            }}
          />
        </div>
      )}
      {step === 4 && (
        <div>
          {app.status === "TO_FIX" &&
          (canEditTopLevelAttachments ||
            generalAttachments.length > 0 ||
            summaryAttachmentTargets.length > 0) ? (
            <section
              data-fix-target="section:GENERAL_ATTACHMENTS"
              tabIndex={-1}
              className="mb-4 scroll-mt-32 rounded-lg border border-border p-4 outline-none"
            >
              <p className="text-sm font-semibold text-foreground/85">
                {t("candidateEditScope.anchors.sections.GENERAL_ATTACHMENTS")}
              </p>
              <p className="mt-2 text-sm text-foreground/65">
                {canEditTopLevelAttachments
                  ? t("candidateEditScope.attachmentsAllowed")
                  : t("candidateEditScope.attachmentsBlocked")}
              </p>
              <div className="mt-4">
                <AttachmentUpload
                  applicationId={id}
                  attachments={generalAttachments}
                  readOnly={!canEditTopLevelAttachments}
                  onAttachmentsChange={replaceTopLevelAttachments}
                />
              </div>
            </section>
          ) : null}

          <div className="rounded-lg border border-border p-6 text-center">
            <p className="mb-4 text-foreground/70">
              {t("messages.reviewBeforeSubmit")}
            </p>
            <SubmitApplicationButton
              applicationId={id}
              requirements={app.requirements}
              pendingFixLabels={pendingFixLabels}
            />
          </div>
          <StepNav
            onPrev={() => {
              void navigateTo(3);
            }}
          />
        </div>
      )}

      {isSaving && (
        <div className="fixed bottom-4 right-4 rounded-md bg-foreground/10 px-3 py-1.5 text-xs text-foreground/60">
          {t("messages.saving")}
        </div>
      )}
    </div>
  );
}
