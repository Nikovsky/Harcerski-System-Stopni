// @file: packages/schemas/src/requirement/definition.schema.ts
import { z } from "zod";

import { createPaginationResponseSchema, paginationQuerySchema } from "../pagination.schema";

const uuidSchema = z.string().uuid();
const isoDateTimeSchema = z.iso.datetime();

export const getAllRequirementDefinitionQuerySchema = paginationQuerySchema;

export const getAllRequirementDefinitionItemSchema = z
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

export const getRequirementDefinitionPathParamsSchema = z.object({ requirementDefinitionUuid: uuidSchema }).strict();
export const getRequirementDefinitionResponseSchema = getAllRequirementDefinitionItemSchema;
export const getAllRequirementDefinitionResponseSchema = createPaginationResponseSchema(getAllRequirementDefinitionItemSchema);
