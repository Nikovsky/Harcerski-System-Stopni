// @file: apps/web/src/components/instructor-application/clients/EditApplicationClient.tsx
"use client";

import { useTranslations } from "next-intl";
import { degreeKey } from "@/lib/applications-i18n";
import { getFieldLabel } from "@/lib/instructor-application-fields";
import { useEditApplicationNavigation } from "@/components/instructor-application/hooks/useEditApplicationNavigation";
import { RequirementForm } from "@/components/instructor-application/requirements/RequirementForm";
import { SubmitApplicationButton } from "@/components/instructor-application/ui/SubmitApplicationButton";
import { StepBasicInfo } from "@/components/instructor-application/steps/StepBasicInfo";
import { StepServiceHistory } from "@/components/instructor-application/steps/StepServiceHistory";
import { StepSupervisor } from "@/components/instructor-application/steps/StepSupervisor";
import { StepNav } from "@/components/instructor-application/steps/shared";
import type { InstructorApplicationDetail } from "@hss/schemas";

const STEPS = ["basicInfo", "serviceHistory", "supervisor", "requirements", "summary"] as const;

type Props = { initialApp: InstructorApplicationDetail; id: string };

export function EditApplicationClient({ initialApp, id }: Props) {
  const t = useTranslations("applications");
  const {
    app,
    isSaving,
    navigationMissingFields,
    navigationError,
    step,
    updateDraft,
    requirementFlushRef,
    navigateTo,
  } = useEditApplicationNavigation({ initialApp, id });

  const translatedDegreeKey = degreeKey(app.template.degreeCode);
  const degreeTitle = translatedDegreeKey ? t(translatedDegreeKey) : app.template.degreeCode;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">
        {degreeTitle}
      </h1>

      {/* Step indicator */}
      <div className="mb-6 flex gap-1">
        {STEPS.map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              void navigateTo(i);
            }}
            className={`flex-1 rounded-sm px-2 py-1 text-xs transition ${
              i === step
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground/60 hover:bg-muted/80"
            }`}
          >
            {t(`steps.${s}`)}
          </button>
        ))}
      </div>

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
          onNext={() => {
            void navigateTo(1);
          }}
        />
      )}
      {step === 1 && (
        <StepServiceHistory
          app={app}
          updateDraft={updateDraft}
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
            flushRef={requirementFlushRef}
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
          <div className="rounded-lg border border-border p-6 text-center">
            <p className="mb-4 text-foreground/70">
              {t("messages.reviewBeforeSubmit")}
            </p>
            <SubmitApplicationButton applicationId={id} requirements={app.requirements} />
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
