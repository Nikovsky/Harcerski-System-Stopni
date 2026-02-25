// @file: packages/schemas/src/commission/member.schema.ts
import { z } from "zod";

import { commissionRoleSchema, statusSchema } from "../enums.schema";
import { createPaginationResponseSchema, paginationQuerySchema } from "../pagination.schema";

const uuidSchema = z.string().uuid();
const isoDateTimeSchema = z.iso.datetime();

export const getAllCommissionMemberQuerySchema = paginationQuerySchema;

export const getAllCommissionMemberItemSchema = z
  .object({
    uuid: uuidSchema,
    commissionUuid: uuidSchema,
    userUuid: uuidSchema,
    role: commissionRoleSchema,
    joinedAt: isoDateTimeSchema,
    leftAt: isoDateTimeSchema.nullable(),
    status: statusSchema,
  })
  .strict();

export const getCommissionMemberPathParamsSchema = z.object({ commissionMemberUuid: uuidSchema }).strict();
export const getCommissionMemberResponseSchema = getAllCommissionMemberItemSchema;
export const getAllCommissionMemberResponseSchema = createPaginationResponseSchema(getAllCommissionMemberItemSchema);
