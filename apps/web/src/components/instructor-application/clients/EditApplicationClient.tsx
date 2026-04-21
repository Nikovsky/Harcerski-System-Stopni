// @file: apps/web/src/components/instructor-application/clients/EditApplicationClient.tsx
"use client";

import dynamic from "next/dynamic";
import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useState,
} from "react";
import { useTranslations } from "next-intl";
import { apiFetch } from "@/lib/api";
import { degreeKey } from "@/lib/applications-i18n";
import {
  canEditInstructorApplicationField,
  canEditInstructorHufcowyPresenceAttachment,
  canEditInstructorRequirement,
  canEditInstructorRequirementAttachments,
  canEditInstructorTopLevelAttachments,
} from "@/lib/instructor-application-editability";
import { getFieldLabel } from "@/lib/instructor-application-fields";
import { useEditApplicationNavigation } from "@/components/instructor-application/hooks/useEditApplicationNavigation";
import { CANDIDATE_FIX_STEPS } from "@/components/instructor-application/revision/candidate-fix-targets";
import {
  areRequirementDraftsEqual,
  buildEditApplicationProgress,
  type RequirementDraftState,
} from "@/components/instructor-application/revision/edit-application-progress";
import { StepNav } from "@/components/instructor-application/steps/shared";
import type {
  InstructorApplicationCandidateRevisionActivityResponse,
  InstructorApplicationDetail,
} from "@hss/schemas/instructor-application";

type Props = { initialApp: InstructorApplicationDetail; id: string };

function StepSectionSkeleton({ showNav = false }: { showNav?: boolean }) {
  return (
    <div aria-busy="true" className="space-y-4">
      <div className="h-24 animate-pulse rounded-xl bg-muted/40" />
      <div className="h-24 animate-pulse rounded-xl bg-muted/30" />
      <div className="h-24 animate-pulse rounded-xl bg-muted/20" />
      {showNav ? <div className="h-11 animate-pulse rounded-xl bg-muted/30" /> : null}
    </div>
  );
}

function CompactSectionSkeleton() {
  return <div aria-busy="true" className="h-24 animate-pulse rounded-xl bg-muted/30" />;
}

function ActionSkeleton() {
  return (
    <div
      aria-busy="true"
      className="mx-auto h-11 w-56 animate-pulse rounded-md bg-muted/30"
    />
  );
}

const LazyStepBasicInfo = dynamic(
  () =>
    import("@/components/instructor-application/steps/StepBasicInfo").then(
      (module) => module.StepBasicInfo,
    ),
  { loading: () => <StepSectionSkeleton /> },
);

const LazyStepServiceHistory = dynamic(
  () =>
    import("@/components/instructor-application/steps/StepServiceHistory").then(
      (module) => module.StepServiceHistory,
    ),
  { loading: () => <StepSectionSkeleton showNav /> },
);

const LazyStepSupervisor = dynamic(
  () =>
    import("@/components/instructor-application/steps/StepSupervisor").then(
      (module) => module.StepSupervisor,
    ),
  { loading: () => <StepSectionSkeleton showNav /> },
);

const LazyRequirementForm = dynamic(
  () =>
    import("@/components/instructor-application/requirements/RequirementForm").then(
      (module) => module.RequirementForm,
    ),
  { loading: () => <StepSectionSkeleton showNav /> },
);

const LazyAttachmentUpload = dynamic(
  () =>
    import("@/components/instructor-application/attachments/AttachmentUpload").then(
      (module) => module.AttachmentUpload,
    ),
  { loading: () => <CompactSectionSkeleton /> },
);

const LazyCandidateFixesPanel = dynamic(
  () =>
    import("@/components/instructor-application/revision/CandidateFixesPanel").then(
      (module) => module.CandidateFixesPanel,
    ),
  { loading: () => <CompactSectionSkeleton /> },
);

const LazySubmitApplicationButton = dynamic(
  () =>
    import("@/components/instructor-application/ui/SubmitApplicationButton").then(
      (module) => module.SubmitApplicationButton,
    ),
  { loading: () => <ActionSkeleton /> },
);

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
  const deferredRequirementDraftsByUuid = useDeferredValue(requirementDraftsByUuid);
  const progressDraftsByUuid =
    step === 3 ? deferredRequirementDraftsByUuid : requirementDraftsByUuid;
  const [progress, setProgress] = useState(() =>
    buildEditApplicationProgress({
      currentApp: initialApp,
      initialApp,
      requirementDraftsByUuid: {},
      t,
    }),
  );

  const translatedDegreeKey = degreeKey(app.template.degreeCode);
  const degreeTitle = translatedDegreeKey
    ? t(translatedDegreeKey)
    : app.template.degreeCode;
  const isLimitedFixScope =
    app.status === "TO_FIX" && app.candidateEditScope.mode === "LIMITED";
  const canEditTopLevelAttachments = canEditInstructorTopLevelAttachments(
    app.candidateEditScope,
  );
  const generalAttachments = app.attachments.filter(
    (attachment) => attachment.uuid !== app.hufcowyPresenceAttachmentUuid,
  );
  const {
    fixTargets,
    fixCountsByStep,
    fixChangedCountsByStep,
    fixProgressByTargetId,
    fieldChangeByField,
    requirementChangeByUuid,
    requirementAttachmentChangeByUuid,
    hufcowyPresenceAttachmentChangeSummary,
    pendingFixLabels,
    summaryAttachmentTargets,
  } = progress;

  useEffect(() => {
    const nextProgress = buildEditApplicationProgress({
      currentApp: app,
      initialApp: initialSnapshot,
      requirementDraftsByUuid: progressDraftsByUuid,
      t,
    });

    startTransition(() => {
      setProgress(nextProgress);
    });
  }, [app, initialSnapshot, progressDraftsByUuid, t]);

  const handleRequirementDraftChange = useCallback(
    (requirementUuid: string, requirementDraft: RequirementDraftState) => {
      startTransition(() => {
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

    void apiFetch<InstructorApplicationCandidateRevisionActivityResponse>(
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
            aria-current={i === step ? "step" : undefined}
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
            <LazyCandidateFixesPanel
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
        <LazyStepBasicInfo
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
        <LazyStepServiceHistory
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
        <LazyStepSupervisor
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
          <LazyRequirementForm
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
                <LazyAttachmentUpload
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
            <LazySubmitApplicationButton
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
