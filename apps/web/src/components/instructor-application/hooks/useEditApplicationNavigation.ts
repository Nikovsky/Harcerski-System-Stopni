// @file: apps/web/src/components/instructor-application/hooks/useEditApplicationNavigation.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import {
  RequirementValidationError,
  type RequirementFlushHandler,
} from "@/components/instructor-application/requirements/requirement-form.types";
import {
  BASIC_DEGREES,
  INSTRUCTOR_RANK_VALUES,
  PRESENCE_VALUES,
  SCOUT_RANK_VALUES,
} from "@/components/instructor-application/instructor-application.constants";
import {
  isOptionalInstructorRequirement,
  type InstructorApplicationDetail,
  type RequirementRowResponse,
  type UpdateInstructorApplication,
} from "@hss/schemas";

type Params = {
  initialApp: InstructorApplicationDetail;
  id: string;
};

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

function getNullableOptionalString(value: string | undefined): string | null {
  return getOptionalString(value) ?? null;
}

function getNullableEnumValue<const T extends string>(
  values: readonly T[],
  value: string | undefined,
): T | null {
  if (!value) {
    return null;
  }
  return includes(values, value) ? value : null;
}

function collectRequirementMissingFields(
  degreeCode: string,
  requirements: RequirementRowResponse[],
): string[] {
  const missing: string[] = [];

  for (const req of requirements) {
    const isOptionalRequirement = isOptionalInstructorRequirement(
      degreeCode,
      req.definition.code,
    );

    if (!isOptionalRequirement && isBlank(req.actionDescription)) {
      missing.push(`requirement_${req.definition.code}_actionDescription`);
    }
    if (!isOptionalRequirement && isBlank(req.verificationText)) {
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
    return collectRequirementMissingFields(
      draft.template.degreeCode,
      draft.requirements,
    );
  }

  return [];
}

function findFirstInvalidStepInRange(
  fromStep: number,
  toStepExclusive: number,
  draft: InstructorApplicationDetail,
): { step: number; missingFields: string[] } | null {
  for (let step = fromStep; step < toStepExclusive; step += 1) {
    const missingFields = getMissingFieldsForStep(step, draft);
    if (missingFields.length > 0) {
      return { step, missingFields };
    }
  }
  return null;
}

function scrollToTop(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function focusFirstMissingField(missingFields: string[]): void {
  if (typeof window === "undefined") {
    return;
  }
  const firstField = missingFields[0];
  if (!firstField) {
    scrollToTop();
    return;
  }

  const fieldElementByDataAttribute = document.querySelector<HTMLElement>(
    `[data-field="${firstField}"]`,
  );

  const fieldElementByNameAttribute = document.querySelector<HTMLElement>(
    `[name="${firstField}"]`,
  );

  const fieldElement = fieldElementByDataAttribute ?? fieldElementByNameAttribute;

  if (fieldElement) {
    fieldElement.scrollIntoView({ behavior: "smooth", block: "center" });
    fieldElement.focus({ preventScroll: true });
    return;
  }

  scrollToTop();
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
      teamFunction: getNullableOptionalString(draft.teamFunction ?? undefined),
      hufiecFunction: getNullableOptionalString(draft.hufiecFunction ?? undefined),
      plannedFinishAt: getNullableOptionalString(draft.plannedFinishAt ?? undefined),
      openTrialForRank: getNullableEnumValue(SCOUT_RANK_VALUES, openTrialForRank),
      openTrialDeadline: getNullableOptionalString(draft.openTrialDeadline ?? undefined),
      hufcowyPresence: getNullableEnumValue(PRESENCE_VALUES, hufcowyPresence),
    };
  }
  if (currentStep === 1) {
    return {
      functionsHistory: getNullableOptionalString(draft.functionsHistory ?? undefined),
      coursesHistory: getNullableOptionalString(draft.coursesHistory ?? undefined),
      campsHistory: getNullableOptionalString(draft.campsHistory ?? undefined),
      successes: getNullableOptionalString(draft.successes ?? undefined),
      failures: getNullableOptionalString(draft.failures ?? undefined),
    };
  }
  if (currentStep === 2) {
    const supervisorInstructorRank = getOptionalString(draft.supervisorInstructorRank ?? undefined);

    return {
      supervisorFirstName: getNullableOptionalString(draft.supervisorFirstName ?? undefined),
      supervisorSurname: getNullableOptionalString(draft.supervisorSurname ?? undefined),
      supervisorInstructorRank: getNullableEnumValue(
        INSTRUCTOR_RANK_VALUES,
        supervisorInstructorRank,
      ),
      supervisorInstructorFunction: getNullableOptionalString(
        draft.supervisorInstructorFunction ?? undefined,
      ),
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
  const [navigationError, setNavigationError] = useState<string | null>(null);

  const requirementFlushRef = useRef<RequirementFlushHandler | null>(null);
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
    setNavigationError(null);
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

      const moveToStepWithValidationError = (
        invalidStep: number,
        missingFields: string[],
      ): void => {
        setNavigationMissingFields(missingFields);
        setNavigationError(null);

        if (invalidStep !== stepRef.current) {
          stepRef.current = invalidStep;
          setStep(invalidStep);
          if (typeof window !== "undefined") {
            window.setTimeout(() => {
              focusFirstMissingField(missingFields);
            }, 0);
          }
          return;
        }

        focusFirstMissingField(missingFields);
      };

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
          await requirementFlushRef.current({
            mode: movingForward ? "strict" : "lenient",
          });
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
          const firstInvalid = findFirstInvalidStepInRange(
            currentStep,
            targetStep,
            appRef.current,
          );

          if (firstInvalid) {
            moveToStepWithValidationError(firstInvalid.step, firstInvalid.missingFields);
            return;
          }
        }
        setNavigationMissingFields([]);
        setNavigationError(null);
      } catch (error: unknown) {
        if (error instanceof RequirementValidationError) {
          const missingFields = error.field ? [error.field] : [];
          setNavigationMissingFields(missingFields);
          focusFirstMissingField(missingFields);
          setNavigationError(error.message);
          return;
        }
        setNavigationMissingFields([]);
        setNavigationError(
          error instanceof ApiError
            ? error.message
            : "Nie udało się zapisać zmian. Spróbuj ponownie.",
        );
        scrollToTop();
        return;
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
    navigationError,
    step,
    setStep,
    updateDraft,
    requirementFlushRef,
    navigateTo,
  };
}
