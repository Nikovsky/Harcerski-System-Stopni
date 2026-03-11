// @file: packages/schemas/src/instructor-application/editability.ts

import type {
  EditableInstructorApplicationField,
  InstructorApplicationCandidateEditScope,
} from "./instructor-application.schema";

export const EDITABLE_INSTRUCTOR_APPLICATION_STATUSES = [
  'DRAFT',
  'TO_FIX',
] as const;

export type EditableInstructorApplicationStatus =
  (typeof EDITABLE_INSTRUCTOR_APPLICATION_STATUSES)[number];

export function isInstructorApplicationEditable(
  status: string | null | undefined,
): status is EditableInstructorApplicationStatus {
  return (
    status === 'DRAFT' ||
    status === 'TO_FIX'
  );
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
