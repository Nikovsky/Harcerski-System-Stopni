// @file: packages/schemas/src/commission/commission.schema.ts
import { z } from "zod";

import { commissionTypeSchema, statusSchema } from "../enums.schema";
import { createPaginationResponseSchema, paginationQuerySchema } from "../pagination.schema";

const uuidSchema = z.string().uuid();
const isoDateTimeSchema = z.iso.datetime();

export const getAllCommissionQuerySchema = paginationQuerySchema;

export const getAllCommissionItemSchema = z
  .object({
    uuid: uuidSchema,
    name: z.string().max(128).nullable(),
    type: commissionTypeSchema.nullable(),
    status: statusSchema,
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict();

export const getCommissionPathParamsSchema = z.object({ commissionUuid: uuidSchema }).strict();
export const getCommissionResponseSchema = getAllCommissionItemSchema;
export const getAllCommissionResponseSchema = createPaginationResponseSchema(getAllCommissionItemSchema);
