// @file: apps/api/src/helpers/object.helper.ts
export function hasAnyDefined<T extends Record<string, any>>(
  obj: T,
  keys: readonly (keyof T)[],
): boolean {
  for (const k of keys) {
    if (obj[k] !== undefined) return true;
  }
  return false;
}