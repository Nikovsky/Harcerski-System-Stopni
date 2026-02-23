// @file: packages/schemas/src/requirement/template.schema.ts
import { z } from "zod";

import { degreeTypeSchema, statusSchema } from "../enums.schema";
import { createPaginationResponseSchema, paginationQuerySchema } from "../pagination.schema";

const uuidSchema = z.string().uuid();
const isoDateTimeSchema = z.iso.datetime();

export const getAllRequirementTemplateQuerySchema = paginationQuerySchema;

export const getAllRequirementTemplateItemSchema = z
  .object({
    uuid: uuidSchema,
    degreeType: degreeTypeSchema,
    degreeCode: z.string().max(32),
    version: z.number().int(),
    status: statusSchema,
    name: z.string().max(128).nullable(),
    description: z.string().nullable(),
    updatedAt: isoDateTimeSchema,
    createdAt: isoDateTimeSchema,
  })
  .strict();

export const getRequirementTemplatePathParamsSchema = z.object({ requirementTemplateUuid: uuidSchema }).strict();
export const getRequirementTemplateResponseSchema = getAllRequirementTemplateItemSchema;
export const getAllRequirementTemplateResponseSchema = createPaginationResponseSchema(getAllRequirementTemplateItemSchema);
