// @file: packages/schemas/src/instructor-application/instructor-application.schema.ts
import { z } from "zod";
import { instructorRankSchema, scoutRankSchema, presenceTypeSchema, requirementStateSchema, degreeTypeSchema, applicationStatusSchema } from "../enums.schema";

// ── File upload security constants ───────────────────────────────────────────
export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.oasis.opendocument.text",
  "video/mp4",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
] as const;

export const ALLOWED_EXTENSIONS_REGEX = /\.(pdf|jpg|jpeg|png|webp|doc|docx|odt|mp4|ppt|pptx)$/i;

export const MAX_FILE_SIZE = 50_000_000; // 50 MB

// ── Create ─────────────────────────────────────────────────────────────────
export const createInstructorApplicationSchema = z.object({
  templateUuid: z.string().uuid(),
});
export type CreateInstructorApplication = z.infer<typeof createInstructorApplicationSchema>;

// ── Update (PATCH) ─────────────────────────────────────────────────────────
export const updateInstructorApplicationSchema = z.object({
  plannedFinishAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  teamFunction: z.string().max(64).nullable().optional(),
  hufiecFunction: z.string().max(64).nullable().optional(),
  openTrialForRank: scoutRankSchema.nullable().optional(),
  openTrialDeadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  hufcowyPresence: presenceTypeSchema.nullable().optional(),
  functionsHistory: z.string().max(10000).nullable().optional(),
  coursesHistory: z.string().max(10000).nullable().optional(),
  campsHistory: z.string().max(10000).nullable().optional(),
  successes: z.string().max(10000).nullable().optional(),
  failures: z.string().max(10000).nullable().optional(),
  supervisorFirstName: z.string().max(32).nullable().optional(),
  supervisorSecondName: z.string().max(32).nullable().optional(),
  supervisorSurname: z.string().max(32).nullable().optional(),
  supervisorInstructorRank: instructorRankSchema.nullable().optional(),
  supervisorInstructorFunction: z.string().max(64).nullable().optional(),
});
export type UpdateInstructorApplication = z.infer<typeof updateInstructorApplicationSchema>;

// ── Update Requirement ─────────────────────────────────────────────────────
export const updateInstructorRequirementSchema = z.object({
  state: requirementStateSchema,
  actionDescription: z.string().max(5000),
  verificationText: z.string().max(5000).nullable().optional(),
});
export type UpdateInstructorRequirement = z.infer<typeof updateInstructorRequirementSchema>;

// ── Response: Attachment ───────────────────────────────────────────────────
export const attachmentResponseSchema = z.object({
  uuid: z.string().uuid(),
  originalFilename: z.string(),
  contentType: z.string(),
  sizeBytes: z.number(),
  uploadedAt: z.string().datetime(),
});
export type AttachmentResponse = z.infer<typeof attachmentResponseSchema>;

// ── Response: Requirement Definition ───────────────────────────────────────
export const requirementDefinitionResponseSchema = z.object({
  uuid: z.string().uuid(),
  code: z.string(),
  description: z.string(),
  isGroup: z.boolean(),
  sortOrder: z.number(),
  parentId: z.string().uuid().nullable(),
});
export type RequirementDefinitionResponse = z.infer<typeof requirementDefinitionResponseSchema>;

// ── Response: Requirement Row ──────────────────────────────────────────────
export const requirementRowResponseSchema = z.object({
  uuid: z.string().uuid(),
  requirementDefinitionUuid: z.string().uuid(),
  state: requirementStateSchema,
  actionDescription: z.string(),
  verificationText: z.string().nullable(),
  definition: requirementDefinitionResponseSchema,
  attachments: z.array(attachmentResponseSchema).optional(),
});
export type RequirementRowResponse = z.infer<typeof requirementRowResponseSchema>;

// ── Response: Candidate Profile (read-only in form) ───────────────────────
export const candidateProfileResponseSchema = z.object({
  firstName: z.string().nullable(),
  surname: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  birthDate: z.string().nullable(),
  hufiecCode: z.string().nullable(),
  hufiecName: z.string().nullable().optional(),
  druzynaCode: z.string().nullable(),
  druzynaName: z.string().nullable().optional(),
  scoutRank: z.string().nullable(),
  scoutRankAwardedAt: z.string().nullable(),
  instructorRank: z.string().nullable(),
  instructorRankAwardedAt: z.string().nullable(),
  inScoutingSince: z.string().nullable(),
  inZhrSince: z.string().nullable(),
  oathDate: z.string().nullable(),
});
export type CandidateProfileResponse = z.infer<typeof candidateProfileResponseSchema>;

// ── Response: Template List Item ───────────────────────────────────────────
export const requirementTemplateListItemSchema = z.object({
  uuid: z.string().uuid(),
  degreeType: degreeTypeSchema,
  degreeCode: z.string(),
  version: z.number(),
  name: z.string().nullable(),
  description: z.string().nullable(),
  definitionsCount: z.number(),
});
export type RequirementTemplateListItem = z.infer<typeof requirementTemplateListItemSchema>;

// ── Response: Application List Item ────────────────────────────────────────
export const instructorApplicationListItemSchema = z.object({
  uuid: z.string().uuid(),
  status: applicationStatusSchema,
  templateName: z.string().nullable(),
  degreeCode: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastSubmittedAt: z.string().datetime().nullable(),
});
export type InstructorApplicationListItem = z.infer<typeof instructorApplicationListItemSchema>;

// ── Response: Application Detail ───────────────────────────────────────────
export const instructorApplicationDetailSchema = z.object({
  uuid: z.string().uuid(),
  status: applicationStatusSchema,
  plannedFinishAt: z.string().nullable(),
  teamFunction: z.string().nullable(),
  hufiecFunction: z.string().nullable(),
  openTrialForRank: scoutRankSchema.nullable(),
  openTrialDeadline: z.string().nullable(),
  hufcowyPresence: presenceTypeSchema.nullable(),
  hufcowyPresenceAttachmentUuid: z.string().uuid().nullable(),
  functionsHistory: z.string().nullable(),
  coursesHistory: z.string().nullable(),
  campsHistory: z.string().nullable(),
  successes: z.string().nullable(),
  failures: z.string().nullable(),
  supervisorFirstName: z.string().nullable(),
  supervisorSecondName: z.string().nullable(),
  supervisorSurname: z.string().nullable(),
  supervisorInstructorRank: instructorRankSchema.nullable(),
  supervisorInstructorFunction: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastSubmittedAt: z.string().datetime().nullable(),
  template: z.object({
    uuid: z.string().uuid(),
    degreeCode: z.string(),
    name: z.string().nullable(),
    version: z.number(),
    groupDefinitions: z.array(z.object({
      uuid: z.string().uuid(),
      code: z.string(),
      description: z.string(),
      sortOrder: z.number(),
      parentId: z.string().uuid().nullable(),
    })).optional(),
  }),
  candidateProfile: candidateProfileResponseSchema,
  requirements: z.array(requirementRowResponseSchema),
  attachments: z.array(attachmentResponseSchema),
});
export type InstructorApplicationDetail = z.infer<typeof instructorApplicationDetailSchema>;

// ── Presign request ────────────────────────────────────────────────────────
export const presignUploadRequestSchema = z.object({
  filename: z.string().min(1).max(255)
    .regex(ALLOWED_EXTENSIONS_REGEX, "Niedozwolone rozszerzenie pliku"),
  contentType: z.string().min(1).max(255)
    .refine((v) => (ALLOWED_MIME_TYPES as readonly string[]).includes(v), "Niedozwolony typ pliku"),
  sizeBytes: z.number().int().min(1).max(MAX_FILE_SIZE),
  requirementUuid: z.string().uuid().optional(),
});
export type PresignUploadRequest = z.infer<typeof presignUploadRequestSchema>;

// ── Confirm upload ─────────────────────────────────────────────────────────
export const confirmUploadRequestSchema = z.object({
  objectKey: z.string().min(1)
    .regex(/^instructor-applications\/[a-f0-9-]+\/[a-f0-9-]+\.(pdf|jpe?g|png|webp|docx?|odt|mp4|pptx?)$/, "Nieprawidłowy klucz obiektu"),
  originalFilename: z.string().min(1).max(255),
  contentType: z.string().min(1).max(255)
    .refine((v) => (ALLOWED_MIME_TYPES as readonly string[]).includes(v), "Niedozwolony typ pliku"),
  sizeBytes: z.number().int().min(1).max(MAX_FILE_SIZE),
  checksum: z.string().max(128).optional(),
  requirementUuid: z.string().uuid().optional(),
  isHufcowyPresence: z.boolean().optional(),
});
export type ConfirmUploadRequest = z.infer<typeof confirmUploadRequestSchema>;
