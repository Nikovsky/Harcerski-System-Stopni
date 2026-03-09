// @file: packages/schemas/src/meeting/meeting.schema.ts
import { z } from "zod";

import {
  commissionTypeSchema,
  meetingStatusSchema,
  registrationStatusSchema,
  slotModeSchema,
} from "../enums.schema";

const uuidSchema = z.string().uuid();
const isoDateRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
const meetingRegistrationApplicationTypeSchema = z.enum([
  "INSTRUCTOR",
  "SCOUT",
]);
const isoDateTimeSchema = z.iso.datetime();

function isValidIsoDate(value: string): boolean {
  const match = isoDateRegex.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

const isoDateSchema = z
  .string()
  .regex(isoDateRegex, "Invalid date format.")
  .refine(isValidIsoDate, "Invalid calendar date.");

export const meetingBookingBlockedReasonCodeSchema = z.enum([
  "NOT_APPROVED_APPLICATION",
  "NO_MATCHING_APPROVED_APPLICATION",
  "MEETING_NOT_OPEN",
  "ALREADY_REGISTERED",
  "NO_FREE_SLOTS",
]);

export const meetingListQuerySchema = z
  .object({
    fromDate: isoDateSchema.optional(),
    toDate: isoDateSchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .refine(
    (value) =>
      !value.fromDate || !value.toDate || value.fromDate <= value.toDate,
    {
      message: "fromDate cannot be after toDate.",
      path: ["toDate"],
    },
  )
  .strict();

export const meetingByDateQuerySchema = z
  .object({
    date: isoDateSchema,
  })
  .strict();

export const meetingPathParamsSchema = z
  .object({
    meetingUuid: uuidSchema,
  })
  .strict();

export const meetingRegistrationPathParamsSchema = z
  .object({
    meetingUuid: uuidSchema,
    registrationUuid: uuidSchema,
  })
  .strict();

export const meetingSlotViewSchema = z
  .object({
    uuid: uuidSchema,
    startTime: isoDateTimeSchema,
    endTime: isoDateTimeSchema,
    isBooked: z.boolean(),
    bookedByMe: z.boolean(),
  })
  .strict();

export const meetingRegistrationSummarySchema = z
  .object({
    uuid: uuidSchema,
    meetingUuid: uuidSchema,
    slotUuid: uuidSchema.nullable(),
    status: registrationStatusSchema,
    registeredAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict();

export const myMeetingRegistrationSlotSchema = z
  .object({
    uuid: uuidSchema,
    startTime: isoDateTimeSchema,
    endTime: isoDateTimeSchema,
  })
  .strict();

export const meetingSlotAdminViewSchema = z
  .object({
    uuid: uuidSchema,
    startTime: isoDateTimeSchema,
    endTime: isoDateTimeSchema,
    sortOrder: z.number().int().min(0),
    isBooked: z.boolean(),
  })
  .strict();

export const meetingRegistrationCandidateViewSchema = z
  .object({
    uuid: uuidSchema,
    firstName: z.string().nullable(),
    surname: z.string().nullable(),
    email: z.string().nullable(),
  })
  .strict();

export const meetingRegistrationApplicationRefSchema = z
  .object({
    type: meetingRegistrationApplicationTypeSchema,
    uuid: uuidSchema,
  })
  .strict();

export const meetingRegistrationListItemSchema = z
  .object({
    uuid: uuidSchema,
    meetingUuid: uuidSchema,
    slotUuid: uuidSchema.nullable(),
    status: registrationStatusSchema,
    assignedTime: isoDateTimeSchema.nullable(),
    registeredAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
    candidate: meetingRegistrationCandidateViewSchema,
    slot: meetingSlotAdminViewSchema.nullable(),
    application: meetingRegistrationApplicationRefSchema.nullable(),
  })
  .strict();

export const meetingListItemSchema = z
  .object({
    uuid: uuidSchema,
    date: isoDateSchema,
    slotMode: slotModeSchema,
    status: meetingStatusSchema,
    commissionType: commissionTypeSchema.nullable(),
    commissionName: z.string().max(128).nullable(),
    totalSlots: z.number().int().min(0),
    availableSlots: z.number().int().min(0),
    registrationsCount: z.number().int().min(0),
    canBook: z.boolean(),
    bookingBlockedReasonCode: meetingBookingBlockedReasonCodeSchema.nullable(),
    myRegistrationUuid: uuidSchema.nullable(),
    canCancelMyRegistration: z.boolean(),
  })
  .strict();

export const meetingDayDetailItemSchema = meetingListItemSchema
  .extend({
    notes: z.string().nullable(),
    slots: z.array(meetingSlotViewSchema),
  })
  .strict();

export const meetingDayDetailsResponseSchema = z
  .object({
    date: isoDateSchema,
    meetings: z.array(meetingDayDetailItemSchema),
  })
  .strict();

export const myMeetingRegistrationListItemSchema = z
  .object({
    registrationUuid: uuidSchema,
    meetingUuid: uuidSchema,
    date: isoDateSchema,
    slotMode: slotModeSchema,
    status: meetingStatusSchema,
    commissionType: commissionTypeSchema.nullable(),
    commissionName: z.string().max(128).nullable(),
    notes: z.string().nullable(),
    assignedTime: isoDateTimeSchema.nullable(),
    registeredAt: isoDateTimeSchema,
    canCancelMyRegistration: z.boolean(),
    slot: myMeetingRegistrationSlotSchema.nullable(),
  })
  .strict();

export const myMeetingRegistrationsResponseSchema = z
  .object({
    registrations: z.array(myMeetingRegistrationListItemSchema),
  })
  .strict();

export const meetingDetailSchema = meetingDayDetailItemSchema
  .extend({
    commissionUuid: uuidSchema,
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
    myRegistration: meetingRegistrationSummarySchema.nullable(),
  })
  .strict();

export const meetingRegistrationCreateBodySchema = z
  .object({
    slotUuid: uuidSchema.optional(),
  })
  .strict();

export const meetingRegistrationCreateResponseSchema = z
  .object({
    uuid: uuidSchema,
    meetingUuid: uuidSchema,
    slotUuid: uuidSchema.nullable(),
    status: registrationStatusSchema,
    registeredAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict();

export const createMeetingBodySchema = z
  .object({
    date: isoDateSchema,
    slotMode: slotModeSchema,
    notes: z.string().max(5000).nullable().optional(),
  })
  .strict();

export const createMeetingResponseSchema = z
  .object({
    uuid: uuidSchema,
    commissionUuid: uuidSchema,
    date: isoDateSchema,
    slotMode: slotModeSchema,
    status: meetingStatusSchema,
    notes: z.string().nullable(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict();

export const createMeetingSlotsBodySchema = z
  .object({
    slots: z
      .array(
        z
          .object({
            startTime: isoDateTimeSchema,
            endTime: isoDateTimeSchema,
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export const createMeetingSlotsResponseSchema = z
  .object({
    meetingUuid: uuidSchema,
    slots: z.array(meetingSlotAdminViewSchema),
  })
  .strict();

export const meetingRegistrationListResponseSchema = z
  .object({
    meetingUuid: uuidSchema,
    registrations: z.array(meetingRegistrationListItemSchema),
  })
  .strict();

export const meetingRegistrationCancelResponseSchema =
  meetingRegistrationSummarySchema;

export const meetingRegistrationReassignBodySchema = z
  .object({
    toSlotUuid: uuidSchema.optional(),
    assignedTime: isoDateTimeSchema.optional(),
  })
  .strict();

export const meetingRegistrationReassignResponseSchema =
  meetingRegistrationSummarySchema;

export type MeetingBookingBlockedReasonCode = z.infer<
  typeof meetingBookingBlockedReasonCodeSchema
>;
export type MeetingListQuery = z.infer<typeof meetingListQuerySchema>;
export type MeetingByDateQuery = z.infer<typeof meetingByDateQuerySchema>;
export type MeetingPathParams = z.infer<typeof meetingPathParamsSchema>;
export type MeetingRegistrationPathParams = z.infer<
  typeof meetingRegistrationPathParamsSchema
>;
export type MeetingSlotView = z.infer<typeof meetingSlotViewSchema>;
export type MeetingRegistrationSummary = z.infer<
  typeof meetingRegistrationSummarySchema
>;
export type MyMeetingRegistrationSlot = z.infer<
  typeof myMeetingRegistrationSlotSchema
>;
export type MeetingSlotAdminView = z.infer<typeof meetingSlotAdminViewSchema>;
export type MeetingRegistrationCandidateView = z.infer<
  typeof meetingRegistrationCandidateViewSchema
>;
export type MeetingRegistrationApplicationRef = z.infer<
  typeof meetingRegistrationApplicationRefSchema
>;
export type MeetingRegistrationListItem = z.infer<
  typeof meetingRegistrationListItemSchema
>;
export type MeetingListItem = z.infer<typeof meetingListItemSchema>;
export type MeetingDayDetailItem = z.infer<typeof meetingDayDetailItemSchema>;
export type MeetingDayDetailsResponse = z.infer<
  typeof meetingDayDetailsResponseSchema
>;
export type MyMeetingRegistrationListItem = z.infer<
  typeof myMeetingRegistrationListItemSchema
>;
export type MyMeetingRegistrationsResponse = z.infer<
  typeof myMeetingRegistrationsResponseSchema
>;
export type MeetingDetail = z.infer<typeof meetingDetailSchema>;
export type MeetingRegistrationCreateBody = z.infer<
  typeof meetingRegistrationCreateBodySchema
>;
export type MeetingRegistrationCreateResponse = z.infer<
  typeof meetingRegistrationCreateResponseSchema
>;
export type CreateMeetingBody = z.infer<typeof createMeetingBodySchema>;
export type CreateMeetingResponse = z.infer<typeof createMeetingResponseSchema>;
export type CreateMeetingSlotsBody = z.infer<typeof createMeetingSlotsBodySchema>;
export type CreateMeetingSlotsResponse = z.infer<
  typeof createMeetingSlotsResponseSchema
>;
export type MeetingRegistrationListResponse = z.infer<
  typeof meetingRegistrationListResponseSchema
>;
export type MeetingRegistrationCancelResponse = z.infer<
  typeof meetingRegistrationCancelResponseSchema
>;
export type MeetingRegistrationReassignBody = z.infer<
  typeof meetingRegistrationReassignBodySchema
>;
export type MeetingRegistrationReassignResponse = z.infer<
  typeof meetingRegistrationReassignResponseSchema
>;
