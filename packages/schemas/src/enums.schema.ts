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

export type UserRole = z.infer<typeof userRoleSchema>;

export const ROLE_RANK: Record<UserRole, number> = {
  ROOT: 100,
  SYSTEM: 90,
  ADMIN: 80,
  COMMISSION_MEMBER: 70,
  SCOUT: 60,
  USER: 50,
};

export const scoutRankSchema = z.enum([
  "MLODZIK",
  "WYWIADOWCA",
  "CWIK",
  "HARCERZ_ORLI",
  "HARCERZ_RZECZYPOSPOLITEJ",
]);
export type ScoutRank = z.infer<typeof scoutRankSchema>;

export const instructorRankSchema = z.enum([
  "PRZEWODNIK",
  "PODHARCMISTRZ_OTWARTA_PROBA",
  "PODHARCMISTRZ",
  "HARCMISTRZ",
]);
export type InstructorRank = z.infer<typeof instructorRankSchema>;

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
export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;

export const presenceTypeSchema = z.enum([
  "IN_PERSON",
  "REMOTE",
  "ATTACHMENT_OPINION",
]);
export type PresenceType = z.infer<typeof presenceTypeSchema>;

export const unitTypeSchema = z.enum([
  "HUFIEC",
  "DRUZYNA",
]);

export const requirementStateSchema = z.enum([
  "DONE",
  "PLANNED",
]);
export type RequirementState = z.infer<typeof requirementStateSchema>;

export const meetingStatusSchema = z.enum([
  "DRAFT",
  "OPEN_FOR_REGISTRATION",
  "CLOSED",
  "COMPLETED",
  "CANCELLED",
]);
export type MeetingStatus = z.infer<typeof meetingStatusSchema>;

export const registrationStatusSchema = z.enum([
  "REGISTERED",
  "CANCELLED",
]);
export type RegistrationStatus = z.infer<typeof registrationStatusSchema>;

export const slotModeSchema = z.enum([
  "SLOTS",
  "DAY_ONLY",
]);
export type SlotMode = z.infer<typeof slotModeSchema>;

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
