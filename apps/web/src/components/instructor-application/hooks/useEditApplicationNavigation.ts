// @file: apps/web/src/components/instructor-application/hooks/useEditApplicationNavigation.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { apiFetch, ApiError } from "@/lib/api";
import {
  EDITABLE_INSTRUCTOR_APPLICATION_FIELDS,
  canEditInstructorApplicationField,
  canEditInstructorHufcowyPresenceAttachment,
  canEditInstructorRequirement,
  isOptionalInstructorRequirement,
} from "@/lib/instructor-application-editability";
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
import type {
  AttachmentResponse,
  EditableInstructorApplicationField,
  InstructorApplicationDetail,
  RequirementRowResponse,
  UpdateInstructorApplication,
} from "@hss/schemas";

type Params = {
  initialApp: InstructorApplicationDetail;
  id: string;
};

type NavigateToOptions = {
  focusTargetId?: string | null;
  skipCompletionValidation?: boolean;
};

function isEditableInstructorApplicationFieldKey(
  value: string,
): value is EditableInstructorApplicationField {
  return (EDITABLE_INSTRUCTOR_APPLICATION_FIELDS as readonly string[]).includes(value);
}

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
  const filterPatchByEditableFields = (
    patch: Partial<UpdateInstructorApplication>,
  ): Partial<UpdateInstructorApplication> =>
    Object.fromEntries(
      Object.entries(patch).filter(([key]) => {
        if (!isEditableInstructorApplicationFieldKey(key)) {
          return false;
        }

        return canEditInstructorApplicationField(draft.candidateEditScope, key);
      }),
    ) as Partial<UpdateInstructorApplication>;

  if (currentStep > 2) return null;

  if (currentStep === 0) {
    const openTrialForRank = getOptionalString(draft.openTrialForRank ?? undefined);
    const hufcowyPresence = getOptionalString(draft.hufcowyPresence ?? undefined);

    return filterPatchByEditableFields({
      teamFunction: getNullableOptionalString(draft.teamFunction ?? undefined),
      hufiecFunction: getNullableOptionalString(draft.hufiecFunction ?? undefined),
      plannedFinishAt: getNullableOptionalString(draft.plannedFinishAt ?? undefined),
      openTrialForRank: getNullableEnumValue(SCOUT_RANK_VALUES, openTrialForRank),
      openTrialDeadline: getNullableOptionalString(draft.openTrialDeadline ?? undefined),
      hufcowyPresence: getNullableEnumValue(PRESENCE_VALUES, hufcowyPresence),
    });
  }
  if (currentStep === 1) {
    return filterPatchByEditableFields({
      functionsHistory: getNullableOptionalString(draft.functionsHistory ?? undefined),
      coursesHistory: getNullableOptionalString(draft.coursesHistory ?? undefined),
      campsHistory: getNullableOptionalString(draft.campsHistory ?? undefined),
      successes: getNullableOptionalString(draft.successes ?? undefined),
      failures: getNullableOptionalString(draft.failures ?? undefined),
    });
  }
  if (currentStep === 2) {
    const supervisorInstructorRank = getOptionalString(draft.supervisorInstructorRank ?? undefined);

    return filterPatchByEditableFields({
      supervisorFirstName: getNullableOptionalString(draft.supervisorFirstName ?? undefined),
      supervisorSurname: getNullableOptionalString(draft.supervisorSurname ?? undefined),
      supervisorInstructorRank: getNullableEnumValue(
        INSTRUCTOR_RANK_VALUES,
        supervisorInstructorRank,
      ),
      supervisorInstructorFunction: getNullableOptionalString(
        draft.supervisorInstructorFunction ?? undefined,
      ),
    });
  }
  return null;
}

export function useEditApplicationNavigation({ initialApp, id }: Params) {
  const t = useTranslations("applications");
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
  const pendingFocusTargetRef = useRef<string | null>(null);
  const pendingFocusAttemptRef = useRef(0);
  const focusRetryTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  useEffect(() => {
    appRef.current = app;
  }, [app]);

  useEffect(() => {
    isSavingRef.current = isSaving;
  }, [isSaving]);

  const clearPendingFocusTarget = useCallback(() => {
    if (focusRetryTimeoutRef.current) {
      window.clearTimeout(focusRetryTimeoutRef.current);
      focusRetryTimeoutRef.current = null;
    }

    pendingFocusTargetRef.current = null;
    pendingFocusAttemptRef.current = 0;
  }, []);

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

  const updateDraft = useCallback((patch: Partial<UpdateInstructorApplication>) => {
    setApp((prev) => {
      const editablePatch = Object.fromEntries(
        Object.entries(patch).filter(([key]) => {
          if (!isEditableInstructorApplicationFieldKey(key)) {
            return false;
          }

          return canEditInstructorApplicationField(prev.candidateEditScope, key);
        }),
      ) as Partial<UpdateInstructorApplication>;

      if (Object.keys(editablePatch).length === 0) {
        return prev;
      }

      const next = { ...prev, ...editablePatch };
      appRef.current = next;
      return next;
    });
    setNavigationMissingFields([]);
    setNavigationError(null);
  }, []);

  const replaceHufcowyPresenceAttachments = useCallback(
    (attachments: AttachmentResponse[]) => {
      setApp((prev) => {
        const nextHufcowyAttachment =
          attachments.length > 0 ? attachments[attachments.length - 1] : null;
        const previousHufcowyAttachmentUuid = prev.hufcowyPresenceAttachmentUuid;
        const preservedAttachments = prev.attachments.filter(
          (attachment) => attachment.uuid !== previousHufcowyAttachmentUuid,
        );
        const nextAttachments = nextHufcowyAttachment
          ? [
              ...preservedAttachments.filter(
                (attachment) => attachment.uuid !== nextHufcowyAttachment.uuid,
              ),
              nextHufcowyAttachment,
            ]
          : preservedAttachments;
        const next = {
          ...prev,
          attachments: nextAttachments,
          hufcowyPresenceAttachmentUuid: nextHufcowyAttachment?.uuid ?? null,
        };

        appRef.current = next;
        persistedAppRef.current = next;
        return next;
      });
      setNavigationMissingFields([]);
      setNavigationError(null);
    },
    [],
  );

  const replaceTopLevelAttachments = useCallback(
    (attachments: AttachmentResponse[]) => {
      setApp((prev) => {
        const currentHufcowyAttachment = prev.hufcowyPresenceAttachmentUuid
          ? prev.attachments.find(
              (attachment) => attachment.uuid === prev.hufcowyPresenceAttachmentUuid,
            ) ?? null
          : null;
        const next = {
          ...prev,
          attachments: currentHufcowyAttachment
            ? [...attachments, currentHufcowyAttachment]
            : attachments,
        };

        appRef.current = next;
        persistedAppRef.current = next;
        return next;
      });
      setNavigationMissingFields([]);
      setNavigationError(null);
    },
    [],
  );

  const replaceRequirementAttachments = useCallback(
    (requirementUuid: string, attachments: AttachmentResponse[]) => {
      setApp((prev) => {
        const next = {
          ...prev,
          requirements: prev.requirements.map((requirement) =>
            requirement.uuid === requirementUuid
              ? {
                  ...requirement,
                  attachments,
                }
              : requirement,
          ),
        };

        appRef.current = next;
        persistedAppRef.current = next;
        return next;
      });
      setNavigationMissingFields([]);
      setNavigationError(null);
    },
    [],
  );

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

  const persistDraftPatch = useCallback(
    async (patch: Partial<UpdateInstructorApplication>) => {
      const editablePatch = Object.fromEntries(
        Object.entries(patch).filter(([key, value]) => {
          if (value === undefined || !isEditableInstructorApplicationFieldKey(key)) {
            return false;
          }

          return canEditInstructorApplicationField(appRef.current.candidateEditScope, key);
        }),
      ) as Partial<UpdateInstructorApplication>;

      if (Object.keys(editablePatch).length === 0) {
        return;
      }

      const changed = getChangedPatchData(editablePatch, persistedAppRef.current);
      if (Object.keys(changed).length === 0) {
        return;
      }

      await apiFetch(`instructor-applications/${id}`, {
        method: "PATCH",
        body: JSON.stringify(changed),
      });

      persistedAppRef.current = { ...persistedAppRef.current, ...changed };
      setNavigationError(null);
    },
    [getChangedPatchData, id],
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
          persistedAppRef.current = fresh;
          appRef.current = fresh;
          setApp(fresh);
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
      if (options.focusTargetId) {
        scheduleFixTargetFocus(options.focusTargetId);
      }
    },
    [clearPendingFocusTarget, getChangedPatchData, id, scheduleFixTargetFocus, t],
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
