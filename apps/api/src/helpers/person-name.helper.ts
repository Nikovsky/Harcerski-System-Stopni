// @file: apps/api/src/helpers/person-name.helper.ts

export type SplitNameResult = {
  firstName: string | null;
  secondName: string | null;
  surname: string | null;
};

/**
 * Splits full name into { firstName, secondName, surname }.
 * - 1 token -> firstName
 * - 2 tokens -> firstName + surname
 * - 3+ tokens -> firstName + middle tokens as secondName + last token as surname
 */
export function splitPersonName(full: string | null | undefined): SplitNameResult {
  if (!full) return { firstName: null, secondName: null, surname: null };

  const parts = full
    .trim()
    .split(/\s+/)
    .map((x) => x.trim())
    .filter(Boolean);

  if (parts.length === 0) return { firstName: null, secondName: null, surname: null };
  if (parts.length === 1) return { firstName: parts[0], secondName: null, surname: null };
  if (parts.length === 2) return { firstName: parts[0], secondName: null, surname: parts[1] };

  return {
    firstName: parts[0],
    secondName: parts.slice(1, -1).join(" "),
    surname: parts[parts.length - 1],
  };
}