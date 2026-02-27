// @file: apps/web/src/lib/instructor-application-fields.ts

import { fieldKey } from "@/lib/applications-i18n";

export const PROFILE_FIELDS = [
  "firstName",
  "surname",
  "email",
  "phone",
  "birthDate",
  "hufiecCode",
  "druzynaCode",
  "scoutRank",
  "scoutRankAwardedAt",
  "instructorRank",
  "instructorRankAwardedAt",
  "inScoutingSince",
  "inZhrSince",
  "oathDate",
] as const;

type FieldLabelKey = NonNullable<ReturnType<typeof fieldKey>>;
type FieldLabelTranslator = (key: FieldLabelKey) => string;

export function getFieldLabel(field: string, t: FieldLabelTranslator): string {
  const key = fieldKey(field);
  return key ? t(key) : field;
}
