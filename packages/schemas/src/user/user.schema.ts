// @file: packages/schemas/src/user/user.schema.ts
import { z } from "zod";

import { instructorRankSchema, scoutRankSchema, statusSchema, userRoleSchema } from "../enums.schema";
import { createPaginationResponseSchema, paginationQuerySchema } from "../pagination.schema";

const uuidSchema = z.string().uuid();
const emailSchema = z.email();
const isoDateTimeSchema = z.iso.datetime();

export const getAllUserQuerySchema = paginationQuerySchema;

export const getAllUserItemSchema = z
  .object({
    uuid: uuidSchema,
    keycloakUuid: uuidSchema,
    firstName: z.string().max(32).nullable(),
    secondName: z.string().max(32).nullable(),
    surname: z.string().max(32).nullable(),
    email: emailSchema.nullable(),
    phone: z.string().max(16).nullable(),
    birthDate: isoDateTimeSchema.nullable(),
    role: userRoleSchema,
    hufiecCode: z.string().max(32).nullable(),
    druzynaCode: z.string().max(32).nullable(),
    scoutRank: scoutRankSchema.nullable(),
    scoutRankAwardedAt: isoDateTimeSchema.nullable(),
    instructorRank: instructorRankSchema.nullable(),
    instructorRankAwardedAt: isoDateTimeSchema.nullable(),
    inScoutingSince: isoDateTimeSchema.nullable(),
    inZhrSince: isoDateTimeSchema.nullable(),
    oathDate: isoDateTimeSchema.nullable(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
    status: statusSchema,
  })
  .strict();

export const getUserPathParamsSchema = z.object({ userUuid: uuidSchema }).strict();
export const getUserResponseSchema = getAllUserItemSchema;
export const getAllUserResponseSchema = createPaginationResponseSchema(getAllUserItemSchema);
