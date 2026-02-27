// @file: apps/web/src/components/instructor-application/requirements/requirement-form-layout.ts

import type { RequirementRowResponse } from "@hss/schemas";
import type { GroupDefinition, TopEntry } from "@/components/instructor-application/requirements/requirement-form.types";

type RequirementFormLayout = {
  childrenByParent: Record<string, RequirementRowResponse[]>;
  entries: TopEntry[];
};

export function buildRequirementFormLayout(
  requirements: RequirementRowResponse[],
  groupDefinitions: GroupDefinition[],
): RequirementFormLayout {
  const childrenByParent: Record<string, RequirementRowResponse[]> = {};
  const topLevelReqs: RequirementRowResponse[] = [];

  for (const requirement of requirements) {
    if (requirement.definition.parentId) {
      (childrenByParent[requirement.definition.parentId] ??= []).push(requirement);
    } else {
      topLevelReqs.push(requirement);
    }
  }

  const entries: TopEntry[] = [];

  for (const groupDefinition of groupDefinitions) {
    if (!groupDefinition.parentId) {
      entries.push({ kind: "group", sortOrder: groupDefinition.sortOrder, def: groupDefinition });
    }
  }

  for (const requirement of topLevelReqs) {
    entries.push({ kind: "req", sortOrder: requirement.definition.sortOrder, req: requirement });
  }

  entries.sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    childrenByParent,
    entries,
  };
}