// @file: apps/web/src/lib/applications-i18n.ts

const DEGREE_CODES = [
  "PWD",
  "PHM",
  "HM",
  "PRZEWODNIK",
  "PODHARCMISTRZ",
  "PODHARCMISTRZ_OTWARTA_PROBA",
  "HARCMISTRZ",
] as const;

const STATUS_CODES = [
  "DRAFT",
  "SUBMITTED",
  "TO_FIX",
  "UNDER_REVIEW",
  "APPROVED",
  "IN_PROGRESS",
  "REPORT_SUBMITTED",
  "COMPLETED_POSITIVE",
  "REJECTED",
  "ARCHIVED",
] as const;

const SCOUT_RANK_CODES = [
  "MLODZIK",
  "WYWIADOWCA",
  "CWIK",
  "HARCERZ_ORLI",
  "HARCERZ_RZECZYPOSPOLITEJ",
] as const;

const PRESENCE_CODES = ["IN_PERSON", "REMOTE", "ATTACHMENT_OPINION"] as const;

const STEP_CODES = ["basicInfo", "serviceHistory", "supervisor", "requirements", "attachments", "summary"] as const;

const FIELD_CODES = [
  "profile",
  "firstName",
  "surname",
  "email",
  "phone",
  "birthDate",
  "hufiecCode",
  "druzynaCode",
  "scoutRank",
  "inScoutingSince",
  "inZhrSince",
  "oathDate",
  "plannedFinishAt",
  "teamFunction",
  "hufiecFunction",
  "openTrialForRank",
  "openTrialDeadline",
  "hufcowyPresence",
  "hufcowyPresenceAttachment",
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
] as const;

type DegreeCode = (typeof DEGREE_CODES)[number];
type StatusCode = (typeof STATUS_CODES)[number];
type ScoutRankCode = (typeof SCOUT_RANK_CODES)[number];
type PresenceCode = (typeof PRESENCE_CODES)[number];
type StepCode = (typeof STEP_CODES)[number];
type FieldCode = (typeof FIELD_CODES)[number];

function includes<const T extends string>(arr: readonly T[], value: string): value is T {
  return (arr as readonly string[]).includes(value);
}

export function degreeKey(code: string): `degree.${DegreeCode}` | null {
  return includes(DEGREE_CODES, code) ? `degree.${code}` : null;
}

export function statusKey(code: string): `status.${StatusCode}` | null {
  return includes(STATUS_CODES, code) ? `status.${code}` : null;
}

export function scoutRankKey(code: string): `scoutRank.${ScoutRankCode}` | null {
  return includes(SCOUT_RANK_CODES, code) ? `scoutRank.${code}` : null;
}

export function presenceKey(code: string): `presence.${PresenceCode}` | null {
  return includes(PRESENCE_CODES, code) ? `presence.${code}` : null;
}

export function stepKey(code: string): `steps.${StepCode}` | null {
  return includes(STEP_CODES, code) ? `steps.${code}` : null;
}

export function fieldKey(code: string): `fields.${FieldCode}` | null {
  return includes(FIELD_CODES, code) ? `fields.${code}` : null;
}
