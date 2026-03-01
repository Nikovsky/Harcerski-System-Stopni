// @file: apps/web/src/components/instructor-application/requirements/requirement-form.types.ts

import type { MutableRefObject } from "react";
import type { RequirementRowResponse } from "@hss/schemas";

export type GroupDefinition = {
  uuid: string;
  code: string;
  description: string;
  sortOrder: number;
  parentId: string | null;
};

export type FlushRegistry = MutableRefObject<Map<string, () => Promise<void>>>;

export type RequirementFormProps = {
  applicationId: string;
  requirements: RequirementRowResponse[];
  groupDefinitions?: GroupDefinition[];
  readOnly?: boolean;
  flushRef?: MutableRefObject<(() => Promise<void>) | null>;
};

export type TopEntry =
  | { kind: "group"; sortOrder: number; def: GroupDefinition }
  | { kind: "req"; sortOrder: number; req: RequirementRowResponse };