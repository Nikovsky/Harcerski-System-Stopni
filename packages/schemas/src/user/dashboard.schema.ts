// @file: packages/schemas/src/user/dashboard.schema.ts
import { z } from "zod";

import {
  instructorRankSchema,
  scoutRankSchema,
  statusSchema,
  userRoleSchema,
} from "../enums.schema";

const uuidSchema = z.string().uuid();
const emailSchema = z.email();
const isoDateTimeSchema = z.iso.datetime();
const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/**
 * JSON contract: Dates go over the wire as ISO strings.
 * Keep this schema as the single source of truth for WEB <-> API.
 */
export const userDashboardResponseSchema = z
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

export type UserDashboardResponse = z.infer<typeof userDashboardResponseSchema>;

/**
 * USER editable fields only.
 * PATCH semantics:
 * - undefined => do not change in DB
 * - null      => clear in DB
 */
export const userDashboardUpdateProfileBodySchema = z
  .object({
    firstName: z.string().min(1).max(32).nullable().optional(),
    secondName: z.string().min(1).max(32).nullable().optional(),
    surname: z.string().min(1).max(32).nullable().optional(),
    phone: z.string().min(3).max(16).nullable().optional(),
    birthDate: dateOnlySchema.nullable().optional(),
  })
  .strict();

export type UserDashboardUpdateProfileBody = z.infer<
  typeof userDashboardUpdateProfileBodySchema
>;

/**
 * Roles > USER can edit additional fields.
 */
export const userDashboardUpdatePrivilegedBodySchema =
  userDashboardUpdateProfileBodySchema
    .extend({
      hufiecCode: z.string().min(1).max(32).nullable().optional(),
      druzynaCode: z.string().min(1).max(32).nullable().optional(),

      scoutRank: scoutRankSchema.nullable().optional(),
      scoutRankAwardedAt: dateOnlySchema.nullable().optional(),

      instructorRank: instructorRankSchema.nullable().optional(),
      instructorRankAwardedAt: dateOnlySchema.nullable().optional(),

      inScoutingSince: dateOnlySchema.nullable().optional(),
      inZhrSince: dateOnlySchema.nullable().optional(),
      oathDate: dateOnlySchema.nullable().optional(),
    })
    .strict();

export const userDashboardPrivilegedKeys = [
  "hufiecCode",
  "druzynaCode",
  "scoutRank",
  "scoutRankAwardedAt",
  "instructorRank",
  "instructorRankAwardedAt",
  "inScoutingSince",
  "inZhrSince",
  "oathDate",
] as const satisfies readonly (keyof UserDashboardUpdatePrivilegedBody)[];

export type UserDashboardUpdatePrivilegedBody = z.infer<
  typeof userDashboardUpdatePrivilegedBodySchema
>;
