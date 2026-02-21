// @file: packages/schemas/src/models/commission-member.schema.ts
import { z } from "zod";

import { commissionRoleSchema, statusSchema } from "../enums.schema";
import { isoDateTimeSchema, uuidSchema } from "../primitives.schema";
import { baseGetAllQuerySchema, createGetAllResponseSchema } from "./_shared.schema";

export const commissionMemberGetAllQuerySchema = baseGetAllQuerySchema;

export const commissionMemberGetAllItemSchema = z
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

export const commissionMemberGetPathParamsSchema = z.object({ commissionMemberUuid: uuidSchema }).strict();
export const commissionMemberGetResponseSchema = commissionMemberGetAllItemSchema;
export const commissionMemberGetAllResponseSchema = createGetAllResponseSchema(commissionMemberGetAllItemSchema);
