// @file: packages/schemas/src/models/user.schema.ts
import { z } from "zod";

import { instructorRankSchema, scoutRankSchema, statusSchema, userRoleSchema } from "../enums.schema";
import { emailSchema, isoDateTimeSchema, uuidSchema } from "../primitives.schema";
import { baseGetAllQuerySchema, createGetAllResponseSchema } from "./_shared.schema";

export const userGetAllQuerySchema = baseGetAllQuerySchema;

export const userGetAllItemSchema = z
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

export const userGetPathParamsSchema = z.object({ userUuid: uuidSchema }).strict();
export const userGetResponseSchema = userGetAllItemSchema;
export const userGetAllResponseSchema = createGetAllResponseSchema(userGetAllItemSchema);
