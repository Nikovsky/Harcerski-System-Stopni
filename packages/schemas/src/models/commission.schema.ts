// @file: packages/schemas/src/models/commission.schema.ts
import { z } from "zod";

import { commissionTypeSchema, statusSchema } from "../enums.schema";
import { isoDateTimeSchema, uuidSchema } from "../primitives.schema";
import { baseGetAllQuerySchema, createGetAllResponseSchema } from "./_shared.schema";

export const commissionGetAllQuerySchema = baseGetAllQuerySchema;

export const commissionGetAllItemSchema = z
  .object({
    uuid: uuidSchema,
    name: z.string().max(128).nullable(),
    type: commissionTypeSchema.nullable(),
    status: statusSchema,
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict();

export const commissionGetPathParamsSchema = z.object({ commissionUuid: uuidSchema }).strict();
export const commissionGetResponseSchema = commissionGetAllItemSchema;
export const commissionGetAllResponseSchema = createGetAllResponseSchema(commissionGetAllItemSchema);
