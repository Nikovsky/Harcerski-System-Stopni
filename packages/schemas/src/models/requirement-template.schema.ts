// @file: packages/schemas/src/models/requirement-template.schema.ts
import { z } from "zod";

import { degreeTypeSchema, statusSchema } from "../enums.schema";
import { isoDateTimeSchema, uuidSchema } from "../primitives.schema";
import { baseGetAllQuerySchema, createGetAllResponseSchema } from "./_shared.schema";

export const requirementTemplateGetAllQuerySchema = baseGetAllQuerySchema;

export const requirementTemplateGetAllItemSchema = z
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

export const requirementTemplateGetPathParamsSchema = z.object({ requirementTemplateUuid: uuidSchema }).strict();
export const requirementTemplateGetResponseSchema = requirementTemplateGetAllItemSchema;
export const requirementTemplateGetAllResponseSchema = createGetAllResponseSchema(requirementTemplateGetAllItemSchema);
