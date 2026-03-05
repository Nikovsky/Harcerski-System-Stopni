// @file: packages/schemas/src/instructor-application/optional-requirements.ts

const OPTIONAL_REQUIREMENTS_BY_DEGREE: Readonly<Record<string, ReadonlySet<string>>> = {
  PWD: new Set(["10"]),
  PHM: new Set(["11"]),
};

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
