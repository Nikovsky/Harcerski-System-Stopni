// @file: packages/schemas/src/enums.schema.ts
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

export const applicationStatusSchema = z.enum([
  "DRAFT",
  "SUBMITTED",
  "TO_FIX",
  "UNDER_REVIEW",
  "APPROVED",
  "IN_PROGRESS",
  "REPORT_SUBMITTED",
  "COMPLETED_POSITIVE",
  "REJECTED",
  "ARCHIVED",
]);

export const presenceTypeSchema = z.enum([
  "IN_PERSON",
  "REMOTE",
  "ATTACHMENT_OPINION",
]);

export const unitTypeSchema = z.enum([
  "HUFIEC",
  "DRUZYNA",
]);

export const requirementStateSchema = z.enum([
  "DONE",
  "PLANNED",
]);

export const meetingStatusSchema = z.enum([
  "DRAFT",
  "OPEN_FOR_REGISTRATION",
  "CLOSED",
  "COMPLETED",
  "CANCELLED",
]);

export const registrationStatusSchema = z.enum([
  "REGISTERED",
  "CANCELLED",
]);

export const slotModeSchema = z.enum([
  "SLOTS",
  "DAY_ONLY",
]);

export const documentTypeSchema = z.enum([
  "MEETING_PROTOCOL",
  "DECISION",
  "OTHER",
]);

export const commissionTypeSchema = z.enum([
  "INSTRUCTOR",
  "SCOUT",
]);

export const commissionRoleSchema = z.enum([
  "CHAIRMAN",
  "SECRETARY",
  "MEMBER",
]);

export const degreeTypeSchema = z.enum([
  "INSTRUCTOR",
  "SCOUT",
]);

export const statusSchema = z.enum([
  "ACTIVE",
  "INACTIVE",
  "ARCHIVED",
  "PENDING_DELETION",
]);
