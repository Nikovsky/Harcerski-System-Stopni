// @file: packages/schemas/src/commission-review/commission-review.schema.ts
import { z } from "zod";

import {
  applicationStatusSchema,
  commissionRoleSchema,
  commissionTypeSchema,
} from "../enums.schema";
import {
  editableInstructorApplicationFieldSchema,
  instructorApplicationDetailSchema,
  instructorReviewAnchorTypeSchema,
  instructorReviewSectionKeySchema,
} from "../instructor-application/instructor-application.schema";
import {
  createPaginationResponseSchema,
  paginationQuerySchema,
} from "../pagination.schema";

const uuidSchema = z.string().uuid();
const isoDateTimeSchema = z.iso.datetime();

export const commissionReviewRevisionRequestStatusSchema = z.enum([
  "DRAFT",
  "PUBLISHED",
  "RESOLVED",
  "CANCELLED",
]);
export type CommissionReviewRevisionRequestStatus = z.infer<
  typeof commissionReviewRevisionRequestStatusSchema
>;

export const commissionReviewCandidateAnnotationStatusSchema = z.enum([
  "DRAFT",
  "PUBLISHED",
  "RESOLVED",
  "CANCELLED",
]);
export type CommissionReviewCandidateAnnotationStatus = z.infer<
  typeof commissionReviewCandidateAnnotationStatusSchema
>;

function coerceStringArray(value: unknown): string[] {
  if (value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }

  if (typeof value === "string") {
    return [value];
  }

  return [];
}

export const commissionReviewMembershipSchema = z
  .object({
    userUuid: uuidSchema,
    commissionUuid: uuidSchema,
    commissionName: z.string().max(128).nullable(),
    commissionType: commissionTypeSchema,
    commissionRole: commissionRoleSchema,
    canManageWorkflow: z.boolean(),
    canDraftFixRequest: z.boolean(),
    canModerateCandidateFeedback: z.boolean(),
    canPublishCandidateFeedback: z.boolean(),
    canChangeStatus: z.boolean(),
  })
  .strict();
export type CommissionReviewMembership = z.infer<
  typeof commissionReviewMembershipSchema
>;

export const commissionReviewMembershipListResponseSchema = z
  .object({
    memberships: z.array(commissionReviewMembershipSchema),
  })
  .strict();
export type CommissionReviewMembershipListResponse = z.infer<
  typeof commissionReviewMembershipListResponseSchema
>;

export const commissionReviewApplicationListQuerySchema = paginationQuerySchema
  .extend({
    q: z.string().trim().max(100).optional(),
    status: z.preprocess(
      coerceStringArray,
      z.array(applicationStatusSchema).max(10).default([]),
    ),
    sort: z
      .enum(["updatedAt", "lastSubmittedAt", "candidateSurname"])
      .default("updatedAt"),
    direction: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict();
export type CommissionReviewApplicationListQuery = z.infer<
  typeof commissionReviewApplicationListQuerySchema
>;

export const commissionReviewApplicationPathParamsSchema = z
  .object({
    commissionUuid: uuidSchema,
    applicationUuid: uuidSchema,
  })
  .strict();
export type CommissionReviewApplicationPathParams = z.infer<
  typeof commissionReviewApplicationPathParamsSchema
>;

export const commissionReviewApplicationListItemSchema = z
  .object({
    uuid: uuidSchema,
    status: applicationStatusSchema,
    degreeCode: z.string(),
    templateName: z.string().nullable(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
    lastSubmittedAt: isoDateTimeSchema.nullable(),
    candidateFirstName: z.string().nullable(),
    candidateSurname: z.string().nullable(),
    candidateEmail: z.string().nullable(),
    hasOpenFixRequest: z.boolean(),
    canChangeStatus: z.boolean(),
    canComment: z.boolean(),
  })
  .strict();
export type CommissionReviewApplicationListItem = z.infer<
  typeof commissionReviewApplicationListItemSchema
>;

export const commissionReviewApplicationListResponseSchema =
  createPaginationResponseSchema(commissionReviewApplicationListItemSchema);
export type CommissionReviewApplicationListResponse = z.infer<
  typeof commissionReviewApplicationListResponseSchema
>;

export const commissionReviewAuthorSchema = z
  .object({
    userUuid: uuidSchema,
    firstName: z.string().nullable(),
    surname: z.string().nullable(),
    email: z.string().nullable(),
  })
  .strict();
export type CommissionReviewAuthor = z.infer<
  typeof commissionReviewAuthorSchema
>;

export const commissionReviewAnchorSchema = z
  .object({
    anchorType: instructorReviewAnchorTypeSchema,
    anchorKey: z.string().trim().min(1).max(128),
  })
  .strict();
export type CommissionReviewAnchor = z.infer<typeof commissionReviewAnchorSchema>;

export const commissionReviewInternalNoteSchema = z
  .object({
    uuid: uuidSchema,
    anchorType: instructorReviewAnchorTypeSchema,
    anchorKey: z.string().min(1).max(128),
    body: z.string(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
    author: commissionReviewAuthorSchema,
  })
  .strict();
export type CommissionReviewInternalNote = z.infer<
  typeof commissionReviewInternalNoteSchema
>;

export const commissionReviewEditableAnchorSchema = z.union([
  z.object({
    anchorType: z.literal("FIELD"),
    anchorKey: editableInstructorApplicationFieldSchema,
  }),
  z.object({
    anchorType: z.literal("SECTION"),
    anchorKey: instructorReviewSectionKeySchema,
  }),
  z.object({
    anchorType: z.literal("REQUIREMENT"),
    anchorKey: uuidSchema,
  }),
  z.object({
    anchorType: z.literal("APPLICATION"),
    anchorKey: uuidSchema,
  }),
  z.object({
    anchorType: z.literal("ATTACHMENT"),
    anchorKey: uuidSchema,
  }),
]);
export type CommissionReviewEditableAnchor = z.infer<
  typeof commissionReviewEditableAnchorSchema
>;

export const commissionReviewCandidateAnnotationAnchorSchema = z.union([
  z.object({
    anchorType: z.literal("FIELD"),
    anchorKey: editableInstructorApplicationFieldSchema,
  }),
  z.object({
    anchorType: z.literal("REQUIREMENT"),
    anchorKey: uuidSchema,
  }),
  z.object({
    anchorType: z.literal("APPLICATION"),
    anchorKey: uuidSchema,
  }),
  z.object({
    anchorType: z.literal("ATTACHMENT"),
    anchorKey: uuidSchema,
  }),
]);
export type CommissionReviewCandidateAnnotationAnchor = z.infer<
  typeof commissionReviewCandidateAnnotationAnchorSchema
>;

export const commissionReviewInternalNoteCreateBodySchema =
  commissionReviewEditableAnchorSchema.and(
    z
      .object({
        body: z.string().trim().min(1).max(5000),
      })
      .strict(),
  );
export type CommissionReviewInternalNoteCreateBody = z.infer<
  typeof commissionReviewInternalNoteCreateBodySchema
>;

export const commissionReviewInternalNoteUpdateBodySchema = z
  .object({
    body: z.string().trim().min(1).max(5000),
  })
  .strict();
export type CommissionReviewInternalNoteUpdateBody = z.infer<
  typeof commissionReviewInternalNoteUpdateBodySchema
>;

export const commissionReviewCandidateAnnotationSchema = z
  .object({
    uuid: uuidSchema,
    anchorType: instructorReviewAnchorTypeSchema,
    anchorKey: z.string().min(1).max(128),
    body: z.string(),
    status: commissionReviewCandidateAnnotationStatusSchema,
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
    publishedAt: isoDateTimeSchema.nullable(),
    resolvedAt: isoDateTimeSchema.nullable(),
    author: commissionReviewAuthorSchema,
  })
  .strict();
export type CommissionReviewCandidateAnnotation = z.infer<
  typeof commissionReviewCandidateAnnotationSchema
>;

export const commissionReviewCandidateAnnotationCreateBodySchema =
  commissionReviewCandidateAnnotationAnchorSchema.and(
    z
      .object({
        body: z.string().trim().min(1).max(5000),
      })
      .strict(),
  );
export type CommissionReviewCandidateAnnotationCreateBody = z.infer<
  typeof commissionReviewCandidateAnnotationCreateBodySchema
>;

export const commissionReviewCandidateAnnotationUpdateBodySchema = z
  .object({
    body: z.string().trim().min(1).max(5000).optional(),
    status: z.enum(["CANCELLED"]).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.body !== undefined || value.status !== undefined) {
      return;
    }

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one field must be updated.",
      path: ["body"],
    });
  });
export type CommissionReviewCandidateAnnotationUpdateBody = z.infer<
  typeof commissionReviewCandidateAnnotationUpdateBodySchema
>;

export const commissionReviewRevisionRequestSchema = z
  .object({
    uuid: uuidSchema,
    status: commissionReviewRevisionRequestStatusSchema,
    summaryMessage: z.string().nullable(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
    publishedAt: isoDateTimeSchema.nullable(),
    candidateFirstViewedAt: isoDateTimeSchema.nullable(),
    candidateFirstEditedAt: isoDateTimeSchema.nullable(),
    candidateLastActivityAt: isoDateTimeSchema.nullable(),
    resolvedAt: isoDateTimeSchema.nullable(),
    createdBy: commissionReviewAuthorSchema,
    updatedBy: commissionReviewAuthorSchema.nullable(),
    publishedBy: commissionReviewAuthorSchema.nullable(),
    resolvedBy: commissionReviewAuthorSchema.nullable(),
    annotations: z.array(commissionReviewCandidateAnnotationSchema),
  })
  .strict();
export type CommissionReviewRevisionRequest = z.infer<
  typeof commissionReviewRevisionRequestSchema
>;

export const commissionReviewResolvedAnnotationComparisonStatusSchema = z.enum([
  "CHANGED",
  "UNCHANGED",
  "NOT_COMPARABLE",
]);
export type CommissionReviewResolvedAnnotationComparisonStatus = z.infer<
  typeof commissionReviewResolvedAnnotationComparisonStatusSchema
>;

export const commissionReviewResolvedRevisionRequestAuditMissingReasonSchema = z.enum([
  "BASELINE_SNAPSHOT_MISSING",
  "RESPONSE_SNAPSHOT_MISSING",
]);
export type CommissionReviewResolvedRevisionRequestAuditMissingReason = z.infer<
  typeof commissionReviewResolvedRevisionRequestAuditMissingReasonSchema
>;

export const commissionReviewResolvedChangeValueSchema = z.discriminatedUnion(
  "kind",
  [
    z
      .object({
        kind: z.literal("TEXT"),
        text: z.string().nullable(),
      })
      .strict(),
    z
      .object({
        kind: z.literal("DATE"),
        date: z.string().nullable(),
      })
      .strict(),
    z
      .object({
        kind: z.literal("ENUM"),
        value: z.string().nullable(),
      })
      .strict(),
    z
      .object({
        kind: z.literal("ATTACHMENT_SET"),
        items: z.array(
          z
            .object({
              uuid: uuidSchema.nullable(),
              originalFilename: z.string(),
              contentType: z.string(),
              sizeBytes: z.number(),
              checksum: z.string().nullable(),
            })
            .strict(),
        ),
      })
      .strict(),
  ],
);
export type CommissionReviewResolvedChangeValue = z.infer<
  typeof commissionReviewResolvedChangeValueSchema
>;

export const commissionReviewResolvedAnnotationChangeSchema = z
  .object({
    key: z.string().min(1).max(128),
    changed: z.boolean(),
    before: commissionReviewResolvedChangeValueSchema.nullable(),
    after: commissionReviewResolvedChangeValueSchema.nullable(),
  })
  .strict();
export type CommissionReviewResolvedAnnotationChange = z.infer<
  typeof commissionReviewResolvedAnnotationChangeSchema
>;

export const commissionReviewResolvedAnnotationAuditSchema = z
  .object({
    annotation: commissionReviewCandidateAnnotationSchema,
    anchorLabel: z.string().nullable(),
    comparisonStatus: commissionReviewResolvedAnnotationComparisonStatusSchema,
    changes: z.array(commissionReviewResolvedAnnotationChangeSchema),
  })
  .strict();
export type CommissionReviewResolvedAnnotationAudit = z.infer<
  typeof commissionReviewResolvedAnnotationAuditSchema
>;

export const commissionReviewResolvedRevisionRequestSchema = z
  .object({
    revisionRequest: commissionReviewRevisionRequestSchema,
    auditAvailable: z.boolean(),
    auditMissingReason:
      commissionReviewResolvedRevisionRequestAuditMissingReasonSchema.nullable(),
    baselineSnapshotRevision: z.number().int().nullable(),
    responseSnapshotRevision: z.number().int().nullable(),
    changedCount: z.number().int().nonnegative(),
    unchangedCount: z.number().int().nonnegative(),
    notComparableCount: z.number().int().nonnegative(),
    annotationAudits: z.array(commissionReviewResolvedAnnotationAuditSchema),
  })
  .strict();
export type CommissionReviewResolvedRevisionRequest = z.infer<
  typeof commissionReviewResolvedRevisionRequestSchema
>;

export const commissionReviewRevisionRequestDraftBodySchema = z
  .object({
    summaryMessage: z.string().trim().max(5000).nullable().optional(),
  })
  .strict();
export type CommissionReviewRevisionRequestDraftBody = z.infer<
  typeof commissionReviewRevisionRequestDraftBodySchema
>;

export const commissionReviewRevisionRequestPublishBodySchema = z
  .object({
    summaryMessage: z.string().trim().max(5000).nullable().optional(),
  })
  .strict();
export type CommissionReviewRevisionRequestPublishBody = z.infer<
  typeof commissionReviewRevisionRequestPublishBodySchema
>;

export const commissionReviewRevisionRequestCancelBodySchema = z
  .object({
    note: z.string().trim().min(1).max(1000).optional(),
  })
  .strict();
export type CommissionReviewRevisionRequestCancelBody = z.infer<
  typeof commissionReviewRevisionRequestCancelBodySchema
>;

export const commissionReviewPermissionsSchema = z
  .object({
    canComment: z.boolean(),
    canDraftFixRequest: z.boolean(),
    canManageWorkflow: z.boolean(),
    canDraftCandidateFeedback: z.boolean(),
    canModerateCandidateFeedback: z.boolean(),
    canPublishCandidateFeedback: z.boolean(),
    canChangeStatus: z.boolean(),
    canViewAttachments: z.boolean(),
  })
  .strict();
export type CommissionReviewPermissions = z.infer<
  typeof commissionReviewPermissionsSchema
>;

export const commissionReviewStatusTransitionBodySchema = z
  .object({
    toStatus: applicationStatusSchema,
    note: z.string().trim().min(1).max(1000).optional(),
  })
  .strict();
export type CommissionReviewStatusTransitionBody = z.infer<
  typeof commissionReviewStatusTransitionBodySchema
>;

export const commissionReviewTimelineStatusChangeSchema = z
  .object({
    kind: z.literal("STATUS_CHANGE"),
    uuid: uuidSchema,
    createdAt: isoDateTimeSchema,
    actorDisplayName: z.string(),
    fromStatus: applicationStatusSchema.nullable(),
    toStatus: applicationStatusSchema,
    note: z.string().nullable(),
  })
  .strict();

export const commissionReviewTimelineRevisionRequestSchema = z
  .object({
    kind: z.literal("REVISION_REQUEST"),
    uuid: uuidSchema,
    createdAt: isoDateTimeSchema,
    action: z.enum(["PUBLISHED", "RESOLVED", "CANCELLED"]),
    actorDisplayName: z.string(),
    summaryMessage: z.string().nullable(),
  })
  .strict();

export const commissionReviewTimelineSystemEventSchema = z
  .object({
    kind: z.literal("SYSTEM_EVENT"),
    uuid: uuidSchema,
    createdAt: isoDateTimeSchema,
    actorDisplayName: z.string(),
    action: z.string(),
    summary: z.string().nullable(),
  })
  .strict();

export const commissionReviewTimelineEventSchema = z.union([
  commissionReviewTimelineStatusChangeSchema,
  commissionReviewTimelineRevisionRequestSchema,
  commissionReviewTimelineSystemEventSchema,
]);
export type CommissionReviewTimelineEvent = z.infer<
  typeof commissionReviewTimelineEventSchema
>;

export const commissionReviewApplicationDetailSchema = z
  .object({
    membership: commissionReviewMembershipSchema,
    application: instructorApplicationDetailSchema,
    permissions: commissionReviewPermissionsSchema,
    internalNotes: z.array(commissionReviewInternalNoteSchema),
    activeRevisionRequest: commissionReviewRevisionRequestSchema.nullable(),
    resolvedRevisionRequests: z.array(
      commissionReviewResolvedRevisionRequestSchema,
    ),
    availableTransitions: z.array(applicationStatusSchema),
    timeline: z.array(commissionReviewTimelineEventSchema),
  })
  .strict();
export type CommissionReviewApplicationDetail = z.infer<
  typeof commissionReviewApplicationDetailSchema
>;

export const commissionReviewInternalNoteCreateResponseSchema =
  commissionReviewInternalNoteSchema;
export type CommissionReviewInternalNoteCreateResponse = z.infer<
  typeof commissionReviewInternalNoteCreateResponseSchema
>;

export const commissionReviewInternalNoteUpdateResponseSchema =
  commissionReviewInternalNoteSchema;
export type CommissionReviewInternalNoteUpdateResponse = z.infer<
  typeof commissionReviewInternalNoteUpdateResponseSchema
>;

export const commissionReviewInternalNoteDeleteResponseSchema = z
  .object({
    uuid: uuidSchema,
  })
  .strict();
export type CommissionReviewInternalNoteDeleteResponse = z.infer<
  typeof commissionReviewInternalNoteDeleteResponseSchema
>;

export const commissionReviewCandidateAnnotationCreateResponseSchema =
  commissionReviewCandidateAnnotationSchema;
export type CommissionReviewCandidateAnnotationCreateResponse = z.infer<
  typeof commissionReviewCandidateAnnotationCreateResponseSchema
>;

export const commissionReviewCandidateAnnotationUpdateResponseSchema =
  commissionReviewCandidateAnnotationSchema;
export type CommissionReviewCandidateAnnotationUpdateResponse = z.infer<
  typeof commissionReviewCandidateAnnotationUpdateResponseSchema
>;

export const commissionReviewRevisionRequestDraftResponseSchema = z
  .object({
    revisionRequest: commissionReviewRevisionRequestSchema,
  })
  .strict();
export type CommissionReviewRevisionRequestDraftResponse = z.infer<
  typeof commissionReviewRevisionRequestDraftResponseSchema
>;

export const commissionReviewRevisionRequestPublishResponseSchema = z
  .object({
    revisionRequest: commissionReviewRevisionRequestSchema,
    applicationStatus: applicationStatusSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict();
export type CommissionReviewRevisionRequestPublishResponse = z.infer<
  typeof commissionReviewRevisionRequestPublishResponseSchema
>;

export const commissionReviewRevisionRequestCancelResponseSchema = z
  .object({
    revisionRequest: commissionReviewRevisionRequestSchema.nullable(),
    applicationStatus: applicationStatusSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict();
export type CommissionReviewRevisionRequestCancelResponse = z.infer<
  typeof commissionReviewRevisionRequestCancelResponseSchema
>;

export const commissionReviewStatusTransitionResponseSchema = z
  .object({
    uuid: uuidSchema,
    status: applicationStatusSchema,
    updatedAt: isoDateTimeSchema,
    activeRevisionRequestStatus:
      commissionReviewRevisionRequestStatusSchema.nullable(),
  })
  .strict();
export type CommissionReviewStatusTransitionResponse = z.infer<
  typeof commissionReviewStatusTransitionResponseSchema
>;

export const commissionReviewAttachmentDownloadResponseSchema = z
  .object({
    url: z.string().url(),
    filename: z.string().min(1),
  })
  .strict();
export type CommissionReviewAttachmentDownloadResponse = z.infer<
  typeof commissionReviewAttachmentDownloadResponseSchema
>;
