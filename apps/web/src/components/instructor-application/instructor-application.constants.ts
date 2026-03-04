// @file: apps/web/src/components/instructor-application/instructor-application.constants.ts

export const SCOUT_RANK_VALUES = [
  "MLODZIK",
  "WYWIADOWCA",
  "CWIK",
  "HARCERZ_ORLI",
  "HARCERZ_RZECZYPOSPOLITEJ",
] as const;

export const PRESENCE_VALUES = [
  "IN_PERSON",
  "REMOTE",
  "ATTACHMENT_OPINION",
] as const;

export const INSTRUCTOR_RANK_VALUES = [
  "PRZEWODNIK",
  "PODHARCMISTRZ_OTWARTA_PROBA",
  "PODHARCMISTRZ",
  "HARCMISTRZ",
] as const;

export const BASIC_DEGREES = new Set(["PWD", "PHM"]);
