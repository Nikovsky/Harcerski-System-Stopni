// @file: packages/schemas/src/application/instructorApplication.schema.ts
import { z } from "zod";

import { applicationStatusSchema, instructorRankSchema, presenceTypeSchema } from "../enums.schema";
import { createPaginationResponseSchema, paginationQuerySchema } from "../pagination.schema";

const uuidSchema = z.string().uuid();
const isoDateTimeSchema = z.iso.datetime();
const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const getAllInstructorApplicationQuerySchema = paginationQuerySchema;

export const getAllInstructorApplicationItemSchema = z
  .object({
    uuid: uuidSchema,
    candidateUuid: uuidSchema,
    templateUuid: uuidSchema,
    status: applicationStatusSchema,
    targetDegree: instructorRankSchema.nullable(),
    plannedFinishAt: dateOnlySchema.nullable(),
    teamFunction: z.string().max(64).nullable(),
    hufiecFunction: z.string().max(64).nullable(),
    openTrialForRank: instructorRankSchema.nullable(),
    openTrialDeadline: dateOnlySchema.nullable(),
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

export const getInstructorApplicationPathParamsSchema = z.object({ instructorApplicationUuid: uuidSchema }).strict();
export const getInstructorApplicationResponseSchema = getAllInstructorApplicationItemSchema;
export const getAllInstructorApplicationResponseSchema = createPaginationResponseSchema(getAllInstructorApplicationItemSchema);
