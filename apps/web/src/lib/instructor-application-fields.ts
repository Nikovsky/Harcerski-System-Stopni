// @file: apps/web/src/lib/instructor-application-fields.ts

import { fieldKey } from "@/lib/applications-i18n";
import type { RequirementRowResponse } from "@hss/schemas";

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
type FieldLabelTranslator = (
  key: FieldLabelKey | "messages.missingRequirementVerification",
  values?: Record<string, string | number>,
) => string;

const REQUIREMENT_VERIFICATION_FIELD_REGEX = /^requirement_(.+)_verificationText$/;

export function getFieldLabel(
  field: string,
  t: FieldLabelTranslator,
  requirements?: RequirementRowResponse[],
): string {
  const requirementMatch = REQUIREMENT_VERIFICATION_FIELD_REGEX.exec(field);
  if (requirementMatch) {
    const requirementCode = requirementMatch[1];
    return t("messages.missingRequirementVerification", { code: requirementCode });
  }

  const key = fieldKey(field);
  return key ? t(key) : field;
}
