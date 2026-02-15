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

/**
 * What the user can edit on their own dashboard (keep it allowlisted).
 * Rank/role/status should be controlled by admin/commission flows.
 */
export const userDashboardUpdateProfileBodySchema = z
  .object({
    firstName: z.string().min(1).max(64).nullable().optional(),
    secondName: z.string().min(1).max(64).nullable().optional(),
    surname: z.string().min(1).max(64).nullable().optional(),
    phone: z.string().min(3).max(32).nullable().optional(),

    // date-only input; API stores Date; response returns ISO datetime
    birthDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),

    hufiecCode: z.string().min(1).max(32).nullable().optional(),
    druzynaCode: z.string().min(1).max(32).nullable().optional(),
  })
  .strict();

export type UserDashboardUpdateProfileBody = z.infer<
  typeof userDashboardUpdateProfileBodySchema
>;