// @file: packages/schemas/src/models/requirement-definition.schema.ts
import { z } from "zod";

import { isoDateTimeSchema, uuidSchema } from "../primitives.schema";
import { baseGetAllQuerySchema, createGetAllResponseSchema } from "./_shared.schema";

export const requirementDefinitionGetAllQuerySchema = baseGetAllQuerySchema;

export const requirementDefinitionGetAllItemSchema = z
  .object({
    uuid: uuidSchema,
    templateId: uuidSchema,
    code: z.string().max(8),
    description: z.string(),
    isGroup: z.boolean(),
    sortOrder: z.number().int(),
    parentId: uuidSchema.nullable(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict();

export const requirementDefinitionGetPathParamsSchema = z.object({ requirementDefinitionUuid: uuidSchema }).strict();
export const requirementDefinitionGetResponseSchema = requirementDefinitionGetAllItemSchema;
export const requirementDefinitionGetAllResponseSchema = createGetAllResponseSchema(requirementDefinitionGetAllItemSchema);
