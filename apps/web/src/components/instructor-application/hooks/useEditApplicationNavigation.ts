// @file: apps/web/src/components/instructor-application/hooks/useEditApplicationNavigation.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { InstructorApplicationDetail, UpdateInstructorApplication } from "@hss/schemas";

type Params = {
  initialApp: InstructorApplicationDetail;
  id: string;
};

const SCOUT_RANK_VALUES = [
  "MLODZIK",
  "WYWIADOWCA",
  "CWIK",
  "HARCERZ_ORLI",
  "HARCERZ_RZECZYPOSPOLITEJ",
] as const;

const PRESENCE_VALUES = ["IN_PERSON", "REMOTE", "ATTACHMENT_OPINION"] as const;

const INSTRUCTOR_RANK_VALUES = [
  "PRZEWODNIK",
  "PODHARCMISTRZ_OTWARTA_PROBA",
  "PODHARCMISTRZ",
  "HARCMISTRZ",
] as const;

function includes<const T extends string>(values: readonly T[], value: string): value is T {
  return (values as readonly string[]).includes(value);
}

function getOptionalString(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function extractStepDataFromDraft(
  currentStep: number,
  draft: InstructorApplicationDetail,
): Partial<UpdateInstructorApplication> | null {
  if (currentStep > 2) return null;

  if (currentStep === 0) {
    const openTrialForRank = getOptionalString(draft.openTrialForRank ?? undefined);
    const hufcowyPresence = getOptionalString(draft.hufcowyPresence ?? undefined);

    return {
      teamFunction: getOptionalString(draft.teamFunction ?? undefined),
      hufiecFunction: getOptionalString(draft.hufiecFunction ?? undefined),
      plannedFinishAt: getOptionalString(draft.plannedFinishAt ?? undefined),
      openTrialForRank:
        openTrialForRank && includes(SCOUT_RANK_VALUES, openTrialForRank)
          ? openTrialForRank
          : undefined,
      openTrialDeadline: getOptionalString(draft.openTrialDeadline ?? undefined),
      hufcowyPresence:
        hufcowyPresence && includes(PRESENCE_VALUES, hufcowyPresence)
          ? hufcowyPresence
          : undefined,
    };
  }
  if (currentStep === 1) {
    return {
      functionsHistory: getOptionalString(draft.functionsHistory ?? undefined),
      coursesHistory: getOptionalString(draft.coursesHistory ?? undefined),
      campsHistory: getOptionalString(draft.campsHistory ?? undefined),
      successes: getOptionalString(draft.successes ?? undefined),
      failures: getOptionalString(draft.failures ?? undefined),
    };
  }
  if (currentStep === 2) {
    const supervisorInstructorRank = getOptionalString(draft.supervisorInstructorRank ?? undefined);

    return {
      supervisorFirstName: getOptionalString(draft.supervisorFirstName ?? undefined),
      supervisorSurname: getOptionalString(draft.supervisorSurname ?? undefined),
      supervisorInstructorRank:
        supervisorInstructorRank && includes(INSTRUCTOR_RANK_VALUES, supervisorInstructorRank)
          ? supervisorInstructorRank
          : undefined,
      supervisorInstructorFunction: getOptionalString(draft.supervisorInstructorFunction ?? undefined),
    };
  }
  return null;
}

export function useEditApplicationNavigation({ initialApp, id }: Params) {
  const [step, setStep] = useState(0);
  const [app, setApp] = useState(initialApp);
  const [isSaving, setIsSaving] = useState(false);

  const requirementFlushRef = useRef<(() => Promise<void>) | null>(null);
  const stepRef = useRef(step);
  const appRef = useRef(app);
  const persistedAppRef = useRef(initialApp);
  const isSavingRef = useRef(isSaving);

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  useEffect(() => {
    appRef.current = app;
  }, [app]);

  useEffect(() => {
    isSavingRef.current = isSaving;
  }, [isSaving]);

  const updateDraft = useCallback((patch: Partial<UpdateInstructorApplication>) => {
    setApp((prev) => {
      const next = { ...prev, ...patch };
      appRef.current = next;
      return next;
    });
  }, []);

  const getChangedPatchData = useCallback(
    (
      data: Partial<UpdateInstructorApplication>,
      currentApp: InstructorApplicationDetail,
    ): Partial<UpdateInstructorApplication> => {
      const filtered = Object.fromEntries(
        Object.entries(data).filter(([, value]) => value !== undefined),
      ) as Record<string, unknown>;

      const changedEntries = Object.entries(filtered).filter(([key, value]) => {
        const currentValue = (currentApp as unknown as Record<string, unknown>)[key];
        return currentValue !== value;
      });

      return Object.fromEntries(changedEntries) as Partial<UpdateInstructorApplication>;
    },
    [],
  );

  const navigateTo = useCallback(
    async (targetStep: number) => {
      const currentStep = stepRef.current;
      if (targetStep === currentStep || isSavingRef.current) return;

      isSavingRef.current = true;
      setIsSaving(true);
      let shouldRefetch = false;
      try {
        if (currentStep <= 2) {
          const data = extractStepDataFromDraft(currentStep, appRef.current);
          if (data) {
            const changed = getChangedPatchData(data, persistedAppRef.current);
            if (Object.keys(changed).length > 0) {
              await apiFetch(`instructor-applications/${id}`, {
                method: "PATCH",
                body: JSON.stringify(changed),
              });
              persistedAppRef.current = { ...persistedAppRef.current, ...changed };
            }
          }
        } else if (currentStep === 3 && requirementFlushRef.current) {
          await requirementFlushRef.current();
          shouldRefetch = true;
        }

        if (shouldRefetch) {
          const fresh = await apiFetch<InstructorApplicationDetail>(
            `instructor-applications/${id}`,
          );
          persistedAppRef.current = fresh;
          appRef.current = fresh;
          setApp(fresh);
        }
      } finally {
        isSavingRef.current = false;
        setIsSaving(false);
      }

      stepRef.current = targetStep;
      setStep(targetStep);
    },
    [getChangedPatchData, id],
  );

  return {
    app,
    isSaving,
    step,
    setStep,
    updateDraft,
    requirementFlushRef,
    navigateTo,
  };
}
