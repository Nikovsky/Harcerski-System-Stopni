// @file: apps/web/src/lib/instructor-application-editability.ts
import type {
  EditableInstructorApplicationField,
  InstructorApplicationCandidateEditScope,
} from "@hss/schemas";

export const EDITABLE_INSTRUCTOR_APPLICATION_FIELDS = [
  "plannedFinishAt",
  "teamFunction",
  "hufiecFunction",
  "openTrialForRank",
  "openTrialDeadline",
  "hufcowyPresence",
  "functionsHistory",
  "coursesHistory",
  "campsHistory",
  "successes",
  "failures",
  "supervisorFirstName",
  "supervisorSecondName",
  "supervisorSurname",
  "supervisorInstructorRank",
  "supervisorInstructorFunction",
] as const satisfies readonly EditableInstructorApplicationField[];

export const EDITABLE_INSTRUCTOR_APPLICATION_STATUSES = [
  "DRAFT",
  "TO_FIX",
] as const;

export type EditableInstructorApplicationStatus =
  (typeof EDITABLE_INSTRUCTOR_APPLICATION_STATUSES)[number];

const OPTIONAL_REQUIREMENTS_BY_DEGREE: Readonly<Record<string, ReadonlySet<string>>> = {
  PWD: new Set(["10"]),
  PHM: new Set(["11"]),
};

export function isInstructorApplicationEditable(
  status: string | null | undefined,
): status is EditableInstructorApplicationStatus {
  return status === "DRAFT" || status === "TO_FIX";
}

export function canEditInstructorApplicationField(
  scope: InstructorApplicationCandidateEditScope | null | undefined,
  field: EditableInstructorApplicationField,
): boolean {
  if (!scope) {
    return false;
  }

  if (scope.mode === "FULL") {
    return true;
  }

  if (scope.mode !== "LIMITED") {
    return false;
  }

  return scope.editableApplicationFields.includes(field);
}

export function canEditInstructorRequirement(
  scope: InstructorApplicationCandidateEditScope | null | undefined,
  requirementUuid: string | null | undefined,
): boolean {
  if (!scope || !requirementUuid) {
    return false;
  }

  if (scope.mode === "FULL") {
    return true;
  }

  if (scope.mode !== "LIMITED") {
    return false;
  }

  return scope.editableRequirementUuids.includes(requirementUuid);
}

export function canEditInstructorRequirementAttachments(
  scope: InstructorApplicationCandidateEditScope | null | undefined,
  requirementUuid: string | null | undefined,
): boolean {
  if (!scope || !requirementUuid) {
    return false;
  }

  if (scope.mode === "FULL") {
    return true;
  }

  if (scope.mode !== "LIMITED") {
    return false;
  }

  return scope.editableRequirementAttachmentUuids.includes(requirementUuid);
}

export function canEditInstructorTopLevelAttachments(
  scope: InstructorApplicationCandidateEditScope | null | undefined,
): boolean {
  if (!scope) {
    return false;
  }

  if (scope.mode === "FULL") {
    return true;
  }

  if (scope.mode !== "LIMITED") {
    return false;
  }

  return scope.allowTopLevelAttachments;
}

export function canEditInstructorHufcowyPresenceAttachment(
  scope: InstructorApplicationCandidateEditScope | null | undefined,
): boolean {
  if (!scope) {
    return false;
  }

  if (scope.mode === "FULL") {
    return true;
  }

  if (scope.mode !== "LIMITED") {
    return false;
  }

  return scope.allowHufcowyPresenceAttachment;
}

export function isOptionalInstructorRequirement(
  degreeCode: string | null | undefined,
  requirementCode: string | null | undefined,
): boolean {
  const normalizedDegreeCode = degreeCode?.trim().toUpperCase();
  const normalizedRequirementCode = requirementCode?.trim().toUpperCase();

  if (!normalizedDegreeCode || !normalizedRequirementCode) {
    return false;
  }

  return (
    OPTIONAL_REQUIREMENTS_BY_DEGREE[normalizedDegreeCode]?.has(
      normalizedRequirementCode,
    ) ?? false
  );
}
