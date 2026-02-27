// @file: packages/schemas/src/instructor-application/editability.ts

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
