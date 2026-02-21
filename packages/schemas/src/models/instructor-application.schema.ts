// @file: packages/schemas/src/models/instructor-application.schema.ts
import { z } from "zod";

import { applicationStatusSchema, instructorRankSchema, presenceTypeSchema } from "../enums.schema";
import { isoDateTimeSchema, uuidSchema } from "../primitives.schema";
import { baseGetAllQuerySchema, createGetAllResponseSchema } from "./_shared.schema";

export const instructorApplicationGetAllQuerySchema = baseGetAllQuerySchema;

export const instructorApplicationGetAllItemSchema = z
  .object({
    uuid: uuidSchema,
    candidateUuid: uuidSchema,
    templateUuid: uuidSchema,
    status: applicationStatusSchema,
    targetDegree: instructorRankSchema.nullable(),
    plannedFinishAt: isoDateTimeSchema.nullable(),
    teamFunction: z.string().max(64).nullable(),
    hufiecFunction: z.string().max(64).nullable(),
    openTrialForRank: instructorRankSchema.nullable(),
    openTrialDeadline: isoDateTimeSchema.nullable(),
    hufcowyPresence: presenceTypeSchema.nullable(),
    hufcowyPresenceAttachmentUuid: uuidSchema.nullable(),
    functionsHistory: z.string().nullable(),
    coursesHistory: z.string().nullable(),
    campsHistory: z.string().nullable(),
    successes: z.string().nullable(),
    failures: z.string().nullable(),
    supervisorFirstName: z.string().max(32).nullable(),
    supervisorSecondName: z.string().max(32).nullable(),
    supervisorSurname: z.string().max(32).nullable(),
    supervisorInstructorRank: instructorRankSchema.nullable(),
    supervisorInstructorFunction: z.string().max(64).nullable(),
    finalReportAttachmentUuid: uuidSchema.nullable(),
    lastSubmittedAt: isoDateTimeSchema.nullable(),
    approvedAt: isoDateTimeSchema.nullable(),
    archivedAt: isoDateTimeSchema.nullable(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict();

export const instructorApplicationGetPathParamsSchema = z.object({ instructorApplicationUuid: uuidSchema }).strict();
export const instructorApplicationGetResponseSchema = instructorApplicationGetAllItemSchema;
export const instructorApplicationGetAllResponseSchema = createGetAllResponseSchema(instructorApplicationGetAllItemSchema);
