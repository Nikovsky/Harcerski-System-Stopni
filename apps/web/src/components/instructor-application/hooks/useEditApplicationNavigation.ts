// @file: apps/web/src/components/instructor-application/hooks/useEditApplicationNavigation.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { apiFetch, ApiError } from "@/lib/api";
import {
  canEditInstructorApplicationField,
  canEditInstructorHufcowyPresenceAttachment,
  canEditInstructorRequirement,
  isOptionalInstructorRequirement,
} from "@/lib/instructor-application-editability";
import {
  RequirementValidationError,
  type RequirementFlushHandler,
} from "@/components/instructor-application/requirements/requirement-form.types";
import { CANDIDATE_FIX_STEPS } from "@/components/instructor-application/revision/candidate-fix-targets";
import { useInstructorApplicationDraftState } from "@/components/instructor-application/hooks/useInstructorApplicationDraftState";
import {
  BASIC_DEGREES,
  INSTRUCTOR_RANK_VALUES,
  PRESENCE_VALUES,
  SCOUT_RANK_VALUES,
} from "@/components/instructor-application/instructor-application.constants";
import type {
  InstructorApplicationDetail,
  RequirementRowResponse,
  UpdateInstructorApplication,
} from "@hss/schemas/instructor-application";

type Params = {
  initialApp: InstructorApplicationDetail;
  id: string;
};

type NavigateToOptions = {
  focusTargetId?: string | null;
  skipCompletionValidation?: boolean;
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
  draft: InstructorApplicationDetail,
): string[] {
  const missing: string[] = [];

  for (const req of requirements) {
    if (!canEditInstructorRequirement(draft.candidateEditScope, req.uuid)) {
      continue;
    }

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

    if (
      canEditInstructorApplicationField(draft.candidateEditScope, "plannedFinishAt") &&
      isBlank(draft.plannedFinishAt)
    ) {
      missing.push("plannedFinishAt");
    }
    if (
      canEditInstructorApplicationField(draft.candidateEditScope, "hufcowyPresence") &&
      isBlank(draft.hufcowyPresence)
    ) {
      missing.push("hufcowyPresence");
    }

    if (
      draft.hufcowyPresence === "ATTACHMENT_OPINION" &&
      (
        canEditInstructorApplicationField(draft.candidateEditScope, "hufcowyPresence")
        || canEditInstructorHufcowyPresenceAttachment(draft.candidateEditScope)
      ) &&
      !draft.hufcowyPresenceAttachmentUuid
    ) {
      missing.push("hufcowyPresenceAttachment");
    }

    if (!BASIC_DEGREES.has(draft.template.degreeCode)) {
      if (
        canEditInstructorApplicationField(draft.candidateEditScope, "teamFunction") &&
        isBlank(draft.teamFunction)
      ) {
        missing.push("teamFunction");
      }
      if (
        canEditInstructorApplicationField(draft.candidateEditScope, "hufiecFunction") &&
        isBlank(draft.hufiecFunction)
      ) {
        missing.push("hufiecFunction");
      }
      if (
        canEditInstructorApplicationField(
          draft.candidateEditScope,
          "openTrialForRank",
        ) &&
        isBlank(draft.openTrialForRank)
      ) {
        missing.push("openTrialForRank");
      }
    }

    return missing;
  }

  if (currentStep === 1) {
    const missing: string[] = [];

    if (
      canEditInstructorApplicationField(draft.candidateEditScope, "functionsHistory") &&
      isBlank(draft.functionsHistory)
    ) {
      missing.push("functionsHistory");
    }
    if (
      canEditInstructorApplicationField(draft.candidateEditScope, "coursesHistory") &&
      isBlank(draft.coursesHistory)
    ) {
      missing.push("coursesHistory");
    }
    if (
      canEditInstructorApplicationField(draft.candidateEditScope, "campsHistory") &&
      isBlank(draft.campsHistory)
    ) {
      missing.push("campsHistory");
    }
    if (
      canEditInstructorApplicationField(draft.candidateEditScope, "successes") &&
      isBlank(draft.successes)
    ) {
      missing.push("successes");
    }
    if (
      canEditInstructorApplicationField(draft.candidateEditScope, "failures") &&
      isBlank(draft.failures)
    ) {
      missing.push("failures");
    }

    return missing;
  }

  if (currentStep === 2) {
    const missing: string[] = [];

    if (
      canEditInstructorApplicationField(
        draft.candidateEditScope,
        "supervisorFirstName",
      ) &&
      isBlank(draft.supervisorFirstName)
    ) {
      missing.push("supervisorFirstName");
    }
    if (
      canEditInstructorApplicationField(
        draft.candidateEditScope,
        "supervisorSurname",
      ) &&
      isBlank(draft.supervisorSurname)
    ) {
      missing.push("supervisorSurname");
    }
    if (
      canEditInstructorApplicationField(
        draft.candidateEditScope,
        "supervisorInstructorRank",
      ) &&
      isBlank(draft.supervisorInstructorRank)
    ) {
      missing.push("supervisorInstructorRank");
    }
    if (
      canEditInstructorApplicationField(
        draft.candidateEditScope,
        "supervisorInstructorFunction",
      ) &&
      isBlank(draft.supervisorInstructorFunction)
    ) {
      missing.push("supervisorInstructorFunction");
    }

    return missing;
  }

  if (currentStep === 3) {
    return collectRequirementMissingFields(
      draft.template.degreeCode,
      draft.requirements,
      draft,
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

function focusFixTarget(targetId: string | null | undefined): boolean {
  if (typeof window === "undefined" || !targetId) {
    return false;
  }

  const targetElement = document.querySelector<HTMLElement>(
    `[data-fix-target="${targetId}"]`,
  );

  if (!targetElement) {
    return false;
  }

  targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
  targetElement.focus({ preventScroll: true });

  const highlightClasses = [
    "ring-2",
    "ring-sky-500",
    "ring-offset-2",
    "ring-offset-background",
  ];

  targetElement.classList.add(...highlightClasses);
  window.setTimeout(() => {
    targetElement.classList.remove(...highlightClasses);
  }, 1800);

  return true;
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

function getStepIndexFromSearchParam(stepId: string | null): number {
  if (!stepId) {
    return 0;
  }

  const index = CANDIDATE_FIX_STEPS.indexOf(
    stepId as (typeof CANDIDATE_FIX_STEPS)[number],
  );

  return index >= 0 ? index : 0;
}

function buildStepHref(
  pathname: string,
  searchParamsString: string,
  stepIndex: number,
): string {
  const params = new URLSearchParams(searchParamsString);
  const stepId = CANDIDATE_FIX_STEPS[stepIndex] ?? CANDIDATE_FIX_STEPS[0];

  if (stepId === CANDIDATE_FIX_STEPS[0]) {
    params.delete("step");
  } else {
    params.set("step", stepId);
  }

  const query = params.toString();
  return query.length > 0 ? `${pathname}?${query}` : pathname;
}

export function useEditApplicationNavigation({ initialApp, id }: Params) {
  const t = useTranslations("applications");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlStep = getStepIndexFromSearchParam(searchParams.get("step"));
  const [step, setStep] = useState(urlStep);
  const [isSaving, setIsSaving] = useState(false);
  const [navigationMissingFields, setNavigationMissingFields] = useState<string[]>(
    [],
  );
  const [navigationError, setNavigationError] = useState<string | null>(null);
  const {
    app,
    appRef,
    replaceDraftFromServer,
    updateDraft: updateDraftState,
    persistDraftPatch: persistDraftStatePatch,
    replaceHufcowyPresenceAttachments: replaceHufcowyPresenceAttachmentsState,
    replaceTopLevelAttachments: replaceTopLevelAttachmentsState,
    replaceRequirementAttachments: replaceRequirementAttachmentsState,
  } = useInstructorApplicationDraftState({ initialApp, id });

  const requirementFlushRef = useRef<RequirementFlushHandler | null>(null);
  const stepRef = useRef(step);
  const isSavingRef = useRef(isSaving);
  const pendingFocusTargetRef = useRef<string | null>(null);
  const pendingFocusAttemptRef = useRef(0);
  const focusRetryTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  useEffect(() => {
    isSavingRef.current = isSaving;
  }, [isSaving]);

  useEffect(() => {
    if (urlStep === stepRef.current) {
      return;
    }

    stepRef.current = urlStep;
    setStep(urlStep);
  }, [urlStep]);

  const clearNavigationFeedback = useCallback(() => {
    setNavigationMissingFields([]);
    setNavigationError(null);
  }, []);

  const clearPendingFocusTarget = useCallback(() => {
    if (focusRetryTimeoutRef.current) {
      window.clearTimeout(focusRetryTimeoutRef.current);
      focusRetryTimeoutRef.current = null;
    }

    pendingFocusTargetRef.current = null;
    pendingFocusAttemptRef.current = 0;
  }, []);

  const syncStepWithUrl = useCallback(
    (nextStep: number) => {
      const nextHref = buildStepHref(pathname, searchParams.toString(), nextStep);
      const currentQuery = searchParams.toString();
      const currentHref = currentQuery.length > 0 ? `${pathname}?${currentQuery}` : pathname;

      if (nextHref === currentHref) {
        return;
      }

      router.replace(nextHref, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const scheduleFixTargetFocus = useCallback(
    (targetId: string | null | undefined) => {
      if (typeof window === "undefined" || !targetId) {
        clearPendingFocusTarget();
        return;
      }

      clearPendingFocusTarget();
      pendingFocusTargetRef.current = targetId;

      const tryFocusTarget = () => {
        const pendingTargetId = pendingFocusTargetRef.current;
        if (!pendingTargetId) {
          focusRetryTimeoutRef.current = null;
          return;
        }

        const didFocus = focusFixTarget(pendingTargetId);
        if (didFocus) {
          clearPendingFocusTarget();
          return;
        }

        pendingFocusAttemptRef.current += 1;
        if (pendingFocusAttemptRef.current >= 20) {
          clearPendingFocusTarget();
          scrollToTop();
          return;
        }

        const nextDelay = pendingFocusAttemptRef.current < 4 ? 40 : 120;
        focusRetryTimeoutRef.current = window.setTimeout(tryFocusTarget, nextDelay);
      };

      focusRetryTimeoutRef.current = window.setTimeout(tryFocusTarget, 0);
    },
    [clearPendingFocusTarget],
  );

  useEffect(() => {
    return () => {
      clearPendingFocusTarget();
    };
  }, [clearPendingFocusTarget]);

  const updateDraft = useCallback(
    (patch: Partial<UpdateInstructorApplication>) => {
      updateDraftState(patch);
      clearNavigationFeedback();
    },
    [clearNavigationFeedback, updateDraftState],
  );

  const persistDraftPatch = useCallback(
    async (patch: Partial<UpdateInstructorApplication>) => {
      await persistDraftStatePatch(patch);
      setNavigationError(null);
    },
    [persistDraftStatePatch],
  );

  const replaceHufcowyPresenceAttachments = useCallback(
    (attachments: InstructorApplicationDetail["attachments"]) => {
      replaceHufcowyPresenceAttachmentsState(attachments);
      clearNavigationFeedback();
    },
    [clearNavigationFeedback, replaceHufcowyPresenceAttachmentsState],
  );

  const replaceTopLevelAttachments = useCallback(
    (attachments: InstructorApplicationDetail["attachments"]) => {
      replaceTopLevelAttachmentsState(attachments);
      clearNavigationFeedback();
    },
    [clearNavigationFeedback, replaceTopLevelAttachmentsState],
  );

  const replaceRequirementAttachments = useCallback(
    (requirementUuid: string, attachments: InstructorApplicationDetail["attachments"]) => {
      replaceRequirementAttachmentsState(requirementUuid, attachments);
      clearNavigationFeedback();
    },
    [clearNavigationFeedback, replaceRequirementAttachmentsState],
  );

  const navigateTo = useCallback(
    async (targetStep: number, options: NavigateToOptions = {}) => {
      const currentStep = stepRef.current;
      clearPendingFocusTarget();

      if (targetStep === currentStep) {
        if (options.focusTargetId) {
          scheduleFixTargetFocus(options.focusTargetId);
        }
        return;
      }

      if (isSavingRef.current) return;

      const skipCompletionValidation = options.skipCompletionValidation ?? false;
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
          syncStepWithUrl(invalidStep);
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
            await persistDraftStatePatch(data);
          }
          if (currentStep === 0 && movingForward) {
            // Attachment in step 0 is updated through a separate endpoint.
            // Refresh before validation so we do not validate against stale data.
            shouldRefetch = true;
          }
        } else if (currentStep === 3 && requirementFlushRef.current) {
          if (!skipCompletionValidation) {
            await requirementFlushRef.current({
              mode: movingForward ? "strict" : "lenient",
            });
            shouldRefetch = true;
          }
        }

        if (shouldRefetch) {
          const fresh = await apiFetch<InstructorApplicationDetail>(
            `instructor-applications/${id}`,
          );
          replaceDraftFromServer(fresh);
        }
        if (movingForward && !skipCompletionValidation) {
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
            : t("messages.saveChangesError"),
        );
        scrollToTop();
        return;
      } finally {
        isSavingRef.current = false;
        setIsSaving(false);
      }

      stepRef.current = targetStep;
      setStep(targetStep);
      syncStepWithUrl(targetStep);
      if (options.focusTargetId) {
        scheduleFixTargetFocus(options.focusTargetId);
      }
    },
    [
      appRef,
      clearPendingFocusTarget,
      id,
      persistDraftStatePatch,
      replaceDraftFromServer,
      scheduleFixTargetFocus,
      syncStepWithUrl,
      t,
    ],
  );

  return {
    app,
    isSaving,
    navigationMissingFields,
    navigationError,
    step,
    setStep,
    updateDraft,
    persistDraftPatch,
    replaceHufcowyPresenceAttachments,
    replaceTopLevelAttachments,
    replaceRequirementAttachments,
    requirementFlushRef,
    navigateTo,
  };
}
