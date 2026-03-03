// @file: apps/web/src/components/instructor-application/hooks/useEditApplicationNavigation.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { RequirementValidationError } from "@/components/instructor-application/requirements/requirement-form.types";
import type {
  InstructorApplicationDetail,
  RequirementRowResponse,
  UpdateInstructorApplication,
} from "@hss/schemas";

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

const BASIC_DEGREES = new Set(["PWD", "PHM"]);

function includes<const T extends string>(values: readonly T[], value: string): value is T {
  return (values as readonly string[]).includes(value);
}

function isBlank(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0;
}

function getOptionalString(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function collectRequirementMissingFields(
  requirements: RequirementRowResponse[],
): string[] {
  const missing: string[] = [];

  for (const req of requirements) {
    if (req.state === "DONE" && isBlank(req.verificationText)) {
      missing.push(`requirement_${req.definition.code}_verificationText`);
    }
  }

  return missing;
}

function getMissingFieldsForStep(
  currentStep: number,
  draft: InstructorApplicationDetail,
): string[] {
  if (currentStep === 0) {
    const missing: string[] = [];

    if (isBlank(draft.plannedFinishAt)) {
      missing.push("plannedFinishAt");
    }
    if (isBlank(draft.hufcowyPresence)) {
      missing.push("hufcowyPresence");
    }

    if (draft.hufcowyPresence === "ATTACHMENT_OPINION" && !draft.hufcowyPresenceAttachmentUuid) {
      missing.push("hufcowyPresenceAttachment");
    }

    if (!BASIC_DEGREES.has(draft.template.degreeCode)) {
      if (isBlank(draft.teamFunction)) {
        missing.push("teamFunction");
      }
      if (isBlank(draft.hufiecFunction)) {
        missing.push("hufiecFunction");
      }
      if (isBlank(draft.openTrialForRank)) {
        missing.push("openTrialForRank");
      }
    }

    return missing;
  }

  if (currentStep === 1) {
    const missing: string[] = [];

    if (isBlank(draft.functionsHistory)) {
      missing.push("functionsHistory");
    }
    if (isBlank(draft.coursesHistory)) {
      missing.push("coursesHistory");
    }
    if (isBlank(draft.campsHistory)) {
      missing.push("campsHistory");
    }
    if (isBlank(draft.successes)) {
      missing.push("successes");
    }
    if (isBlank(draft.failures)) {
      missing.push("failures");
    }

    return missing;
  }

  if (currentStep === 2) {
    const missing: string[] = [];

    if (isBlank(draft.supervisorFirstName)) {
      missing.push("supervisorFirstName");
    }
    if (isBlank(draft.supervisorSurname)) {
      missing.push("supervisorSurname");
    }
    if (isBlank(draft.supervisorInstructorRank)) {
      missing.push("supervisorInstructorRank");
    }
    if (isBlank(draft.supervisorInstructorFunction)) {
      missing.push("supervisorInstructorFunction");
    }

    return missing;
  }

  if (currentStep === 3) {
    return collectRequirementMissingFields(draft.requirements);
  }

  return [];
}

function collectMissingFieldsBeforeStep(
  targetStep: number,
  draft: InstructorApplicationDetail,
): string[] {
  const allMissing = new Set<string>();
  for (let i = 0; i < targetStep; i += 1) {
    for (const field of getMissingFieldsForStep(i, draft)) {
      allMissing.add(field);
    }
  }
  return [...allMissing];
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
  const [navigationMissingFields, setNavigationMissingFields] = useState<string[]>(
    [],
  );

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
    setNavigationMissingFields([]);
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
      const movingForward = targetStep > currentStep;

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
          if (currentStep === 0 && movingForward) {
            // Attachment in step 0 is updated through a separate endpoint.
            // Refresh before validation so we do not validate against stale data.
            shouldRefetch = true;
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
        if (movingForward) {
          const missingFields = collectMissingFieldsBeforeStep(
            targetStep,
            appRef.current,
          );
          if (missingFields.length > 0) {
            setNavigationMissingFields(missingFields);
            return;
          }
        }
        setNavigationMissingFields([]);
      } catch (error: unknown) {
        if (error instanceof RequirementValidationError) {
          if (error.field) {
            setNavigationMissingFields([error.field]);
          }
          return;
        }
        throw error;
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
    navigationMissingFields,
    step,
    setStep,
    updateDraft,
    requirementFlushRef,
    navigateTo,
  };
}
