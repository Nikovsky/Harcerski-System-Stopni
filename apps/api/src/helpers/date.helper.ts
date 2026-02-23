// @file: apps/api/src/helpers/date.helper.ts

/**
 * Converts Date (or null/undefined) into ISO string (or null).
 */
export function isoOrNull(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

/**
 * Converts Date into ISO string (non-nullable).
 */
export function iso(d: Date): string {
  return d.toISOString();
}

/**
 * For date-only strings: "YYYY-MM-DD" -> UTC midnight Date.
 * Assumes input was validated (e.g., zod regex).
 */
export function dateOnlyToUtc(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

/**
 * Same as above but supports null/undefined (PATCH DTOs).
 */
export function dateOnlyToUtcOrNull(
  value: string | null | undefined,
): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return dateOnlyToUtc(value);
}