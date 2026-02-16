// @file: packages/schemas/src/user/dashboard.schema.ts
import { z } from "zod";

export const userRoleSchema = z.enum([
  "ROOT",
  "SYSTEM",
  "ADMIN",
  "COMMISSION_MEMBER",
  "SCOUT",
  "USER",
]);

export const scoutRankSchema = z.enum([
  "MLODZIK",
  "WYWIADOWCA",
  "CWIK",
  "HARCERZ_ORLI",
  "HARCERZ_RZECZYPOSPOLITEJ",
]);

export const instructorRankSchema = z.enum([
  "PRZEWODNIK",
  "PODHARCMISTRZ_OTWARTA_PROBA",
  "PODHARCMISTRZ",
  "HARCMISTRZ",
]);

export const statusSchema = z.enum([
  "ACTIVE",
  "INACTIVE",
  "ARCHIVED",
  "PENDING_DELETION",
]);

/**
 * JSON contract: Dates go over the wire as ISO strings.
 * Keep this schema as the single source of truth for WEB <-> API.
 */
export const userDashboardResponseSchema = z
  .object({
    uuid: z.string().uuid(),
    keycloakUuid: z.string().uuid(),

    firstName: z.string().max(64).nullable(),
    secondName: z.string().max(64).nullable(),
    surname: z.string().max(64).nullable(),
    email: z.string().email().nullable(),
    phone: z.string().max(32).nullable(),

    birthDate: z.string().datetime().nullable(),

    role: userRoleSchema,
    hufiecCode: z.string().max(32).nullable(),
    druzynaCode: z.string().max(32).nullable(),

    scoutRank: scoutRankSchema.nullable(),
    scoutRankAwardedAt: z.string().datetime().nullable(),

    instructorRank: instructorRankSchema.nullable(),
    instructorRankAwardedAt: z.string().datetime().nullable(),

    inScoutingSince: z.string().datetime().nullable(),
    inZhrSince: z.string().datetime().nullable(),
    oathDate: z.string().datetime().nullable(),

    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),

    status: statusSchema,
  })
  .strict();

export type UserDashboardResponse = z.infer<typeof userDashboardResponseSchema>;

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/**
 * USER editable fields only.
 * PATCH semantics:
 * - undefined => do not change in DB
 * - null      => clear in DB
 */
export const userDashboardUpdateProfileBodySchema = z
  .object({
    firstName: z.string().min(1).max(64).nullable().optional(),
    secondName: z.string().min(1).max(64).nullable().optional(),
    surname: z.string().min(1).max(64).nullable().optional(),
    phone: z.string().min(3).max(32).nullable().optional(),
    birthDate: dateOnly.nullable().optional(),
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
      scoutRankAwardedAt: dateOnly.nullable().optional(),

      instructorRank: instructorRankSchema.nullable().optional(),
      instructorRankAwardedAt: dateOnly.nullable().optional(),

      inScoutingSince: dateOnly.nullable().optional(),
      inZhrSince: dateOnly.nullable().optional(),
      oathDate: dateOnly.nullable().optional(),
    })
    .strict();

export type UserDashboardUpdatePrivilegedBody = z.infer<
  typeof userDashboardUpdatePrivilegedBodySchema
>;