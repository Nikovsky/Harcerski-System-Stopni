-- @file: packages/database/prisma/migrations/20260310201500_instructor_review_annotations/migration.sql
-- CreateEnum
CREATE TYPE "InstructorReviewAnchorType" AS ENUM (
  'APPLICATION',
  'SECTION',
  'FIELD',
  'REQUIREMENT',
  'ATTACHMENT'
);

-- CreateEnum
CREATE TYPE "InstructorReviewRevisionRequestStatus" AS ENUM (
  'DRAFT',
  'PUBLISHED',
  'RESOLVED',
  'CANCELLED'
);

-- CreateEnum
CREATE TYPE "InstructorReviewCandidateAnnotationStatus" AS ENUM (
  'DRAFT',
  'PUBLISHED',
  'RESOLVED',
  'CANCELLED'
);

-- CreateTable
CREATE TABLE "InstructorReviewInternalNote" (
  "uuid" UUID NOT NULL,
  "applicationUuid" UUID NOT NULL,
  "anchorType" "InstructorReviewAnchorType" NOT NULL,
  "anchorKey" VARCHAR(128) NOT NULL,
  "body" TEXT NOT NULL,
  "createdByUuid" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "InstructorReviewInternalNote_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "InstructorReviewRevisionRequest" (
  "uuid" UUID NOT NULL,
  "applicationUuid" UUID NOT NULL,
  "status" "InstructorReviewRevisionRequestStatus" NOT NULL DEFAULT 'DRAFT',
  "summaryMessage" TEXT,
  "createdByUuid" UUID NOT NULL,
  "updatedByUuid" UUID,
  "publishedByUuid" UUID,
  "resolvedByUuid" UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL,
  "publishedAt" TIMESTAMPTZ,
  "resolvedAt" TIMESTAMPTZ,

  CONSTRAINT "InstructorReviewRevisionRequest_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "InstructorReviewCandidateAnnotation" (
  "uuid" UUID NOT NULL,
  "revisionRequestUuid" UUID NOT NULL,
  "anchorType" "InstructorReviewAnchorType" NOT NULL,
  "anchorKey" VARCHAR(128) NOT NULL,
  "body" TEXT NOT NULL,
  "status" "InstructorReviewCandidateAnnotationStatus" NOT NULL DEFAULT 'DRAFT',
  "createdByUuid" UUID NOT NULL,
  "updatedByUuid" UUID,
  "publishedByUuid" UUID,
  "resolvedByUuid" UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL,
  "publishedAt" TIMESTAMPTZ,
  "resolvedAt" TIMESTAMPTZ,

  CONSTRAINT "InstructorReviewCandidateAnnotation_pkey" PRIMARY KEY ("uuid")
);

-- AddForeignKey
ALTER TABLE "InstructorReviewInternalNote"
ADD CONSTRAINT "InstructorReviewInternalNote_applicationUuid_fkey"
FOREIGN KEY ("applicationUuid") REFERENCES "InstructorApplication"("uuid")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InstructorReviewInternalNote"
ADD CONSTRAINT "InstructorReviewInternalNote_createdByUuid_fkey"
FOREIGN KEY ("createdByUuid") REFERENCES "User"("uuid")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InstructorReviewRevisionRequest"
ADD CONSTRAINT "InstructorReviewRevisionRequest_applicationUuid_fkey"
FOREIGN KEY ("applicationUuid") REFERENCES "InstructorApplication"("uuid")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InstructorReviewRevisionRequest"
ADD CONSTRAINT "InstructorReviewRevisionRequest_createdByUuid_fkey"
FOREIGN KEY ("createdByUuid") REFERENCES "User"("uuid")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InstructorReviewRevisionRequest"
ADD CONSTRAINT "InstructorReviewRevisionRequest_updatedByUuid_fkey"
FOREIGN KEY ("updatedByUuid") REFERENCES "User"("uuid")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InstructorReviewRevisionRequest"
ADD CONSTRAINT "InstructorReviewRevisionRequest_publishedByUuid_fkey"
FOREIGN KEY ("publishedByUuid") REFERENCES "User"("uuid")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InstructorReviewRevisionRequest"
ADD CONSTRAINT "InstructorReviewRevisionRequest_resolvedByUuid_fkey"
FOREIGN KEY ("resolvedByUuid") REFERENCES "User"("uuid")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InstructorReviewCandidateAnnotation"
ADD CONSTRAINT "InstructorReviewCandidateAnnotation_revisionRequestUuid_fkey"
FOREIGN KEY ("revisionRequestUuid") REFERENCES "InstructorReviewRevisionRequest"("uuid")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InstructorReviewCandidateAnnotation"
ADD CONSTRAINT "InstructorReviewCandidateAnnotation_createdByUuid_fkey"
FOREIGN KEY ("createdByUuid") REFERENCES "User"("uuid")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InstructorReviewCandidateAnnotation"
ADD CONSTRAINT "InstructorReviewCandidateAnnotation_updatedByUuid_fkey"
FOREIGN KEY ("updatedByUuid") REFERENCES "User"("uuid")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InstructorReviewCandidateAnnotation"
ADD CONSTRAINT "InstructorReviewCandidateAnnotation_publishedByUuid_fkey"
FOREIGN KEY ("publishedByUuid") REFERENCES "User"("uuid")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InstructorReviewCandidateAnnotation"
ADD CONSTRAINT "InstructorReviewCandidateAnnotation_resolvedByUuid_fkey"
FOREIGN KEY ("resolvedByUuid") REFERENCES "User"("uuid")
ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "InstructorReviewInternalNote_applicationUuid_createdAt_idx"
ON "InstructorReviewInternalNote"("applicationUuid", "createdAt" DESC);

CREATE INDEX "InstructorReviewInternalNote_applicationUuid_anchor_idx"
ON "InstructorReviewInternalNote"("applicationUuid", "anchorType", "anchorKey", "createdAt" DESC);

CREATE INDEX "InstructorReviewInternalNote_createdByUuid_createdAt_idx"
ON "InstructorReviewInternalNote"("createdByUuid", "createdAt" DESC);

CREATE INDEX "InstructorReviewRevisionRequest_applicationUuid_status_updatedAt_idx"
ON "InstructorReviewRevisionRequest"("applicationUuid", "status", "updatedAt" DESC);

CREATE INDEX "InstructorReviewRevisionRequest_createdByUuid_createdAt_idx"
ON "InstructorReviewRevisionRequest"("createdByUuid", "createdAt" DESC);

CREATE INDEX "InstructorReviewRevisionRequest_publishedByUuid_publishedAt_idx"
ON "InstructorReviewRevisionRequest"("publishedByUuid", "publishedAt" DESC);

CREATE INDEX "InstructorReviewRevisionRequest_resolvedByUuid_resolvedAt_idx"
ON "InstructorReviewRevisionRequest"("resolvedByUuid", "resolvedAt" DESC);

CREATE UNIQUE INDEX "InstructorReviewRevisionRequest_single_open_idx"
ON "InstructorReviewRevisionRequest"("applicationUuid")
WHERE "status" IN ('DRAFT', 'PUBLISHED');

CREATE INDEX "InstructorReviewCandidateAnnotation_revisionRequestUuid_status_createdAt_idx"
ON "InstructorReviewCandidateAnnotation"("revisionRequestUuid", "status", "createdAt" DESC);

CREATE INDEX "InstructorReviewCandidateAnnotation_revisionRequestUuid_anchor_idx"
ON "InstructorReviewCandidateAnnotation"("revisionRequestUuid", "anchorType", "anchorKey", "status");

CREATE INDEX "InstructorReviewCandidateAnnotation_createdByUuid_createdAt_idx"
ON "InstructorReviewCandidateAnnotation"("createdByUuid", "createdAt" DESC);

CREATE INDEX "InstructorReviewCandidateAnnotation_publishedByUuid_publishedAt_idx"
ON "InstructorReviewCandidateAnnotation"("publishedByUuid", "publishedAt" DESC);

CREATE INDEX "InstructorReviewCandidateAnnotation_resolvedByUuid_resolvedAt_idx"
ON "InstructorReviewCandidateAnnotation"("resolvedByUuid", "resolvedAt" DESC);

ALTER TABLE "InstructorReviewRevisionRequest"
ADD CONSTRAINT "InstructorReviewRevisionRequest_summary_or_lifecycle_chk"
CHECK (
  ("status" = 'DRAFT' AND "publishedAt" IS NULL AND "resolvedAt" IS NULL) OR
  ("status" = 'PUBLISHED' AND "publishedAt" IS NOT NULL AND "resolvedAt" IS NULL) OR
  ("status" = 'RESOLVED' AND "publishedAt" IS NOT NULL AND "resolvedAt" IS NOT NULL) OR
  ("status" = 'CANCELLED')
);

ALTER TABLE "InstructorReviewCandidateAnnotation"
ADD CONSTRAINT "InstructorReviewCandidateAnnotation_lifecycle_chk"
CHECK (
  ("status" = 'DRAFT' AND "publishedAt" IS NULL AND "resolvedAt" IS NULL) OR
  ("status" = 'PUBLISHED' AND "publishedAt" IS NOT NULL AND "resolvedAt" IS NULL) OR
  ("status" = 'RESOLVED' AND "publishedAt" IS NOT NULL AND "resolvedAt" IS NOT NULL) OR
  ("status" = 'CANCELLED')
);

-- Backfill instructor commission comments into semantic internal notes.
INSERT INTO "InstructorReviewInternalNote" (
  "uuid",
  "applicationUuid",
  "anchorType",
  "anchorKey",
  "body",
  "createdByUuid",
  "createdAt"
)
SELECT
  "ApplicationComment"."uuid",
  COALESCE(
    "ApplicationComment"."instructorApplicationUuid",
    "InstructorApplicationRequirement"."applicationUuid"
  ) AS "applicationUuid",
  CASE
    WHEN "ApplicationComment"."instructorRequirementUuid" IS NOT NULL
      THEN 'REQUIREMENT'::"InstructorReviewAnchorType"
    ELSE 'APPLICATION'::"InstructorReviewAnchorType"
  END AS "anchorType",
  COALESCE(
    "ApplicationComment"."instructorRequirementUuid"::text,
    COALESCE(
      "ApplicationComment"."instructorApplicationUuid",
      "InstructorApplicationRequirement"."applicationUuid"
    )::text
  ) AS "anchorKey",
  "ApplicationComment"."body",
  "ApplicationComment"."authorUuid",
  "ApplicationComment"."createdAt"
FROM "ApplicationComment"
LEFT JOIN "InstructorApplicationRequirement"
  ON "InstructorApplicationRequirement"."uuid" = "ApplicationComment"."instructorRequirementUuid"
WHERE
  "ApplicationComment"."instructorApplicationUuid" IS NOT NULL OR
  "ApplicationComment"."instructorRequirementUuid" IS NOT NULL;

-- Backfill legacy fix requests into revision requests.
INSERT INTO "InstructorReviewRevisionRequest" (
  "uuid",
  "applicationUuid",
  "status",
  "summaryMessage",
  "createdByUuid",
  "updatedByUuid",
  "publishedByUuid",
  "resolvedByUuid",
  "createdAt",
  "updatedAt",
  "publishedAt",
  "resolvedAt"
)
SELECT
  "uuid",
  "applicationUuid",
  ("status"::text)::"InstructorReviewRevisionRequestStatus",
  "message",
  "createdByUuid",
  "updatedByUuid",
  "publishedByUuid",
  "resolvedByUuid",
  "createdAt",
  "updatedAt",
  "publishedAt",
  "resolvedAt"
FROM "InstructorApplicationFixRequest";

-- Backfill legacy fix request application fields into anchored candidate annotations.
INSERT INTO "InstructorReviewCandidateAnnotation" (
  "uuid",
  "revisionRequestUuid",
  "anchorType",
  "anchorKey",
  "body",
  "status",
  "createdByUuid",
  "updatedByUuid",
  "publishedByUuid",
  "resolvedByUuid",
  "createdAt",
  "updatedAt",
  "publishedAt",
  "resolvedAt"
)
SELECT
  (
    substring(md5("fr"."uuid"::text || ':field:' || "field"), 1, 8) || '-' ||
    substring(md5("fr"."uuid"::text || ':field:' || "field"), 9, 4) || '-' ||
    substring(md5("fr"."uuid"::text || ':field:' || "field"), 13, 4) || '-' ||
    substring(md5("fr"."uuid"::text || ':field:' || "field"), 17, 4) || '-' ||
    substring(md5("fr"."uuid"::text || ':field:' || "field"), 21, 12)
  )::uuid,
  "fr"."uuid",
  'FIELD'::"InstructorReviewAnchorType",
  "field",
  COALESCE(NULLIF(BTRIM("fr"."message"), ''), 'Legacy revision note for this field.'),
  ("fr"."status"::text)::"InstructorReviewCandidateAnnotationStatus",
  "fr"."createdByUuid",
  "fr"."updatedByUuid",
  "fr"."publishedByUuid",
  "fr"."resolvedByUuid",
  "fr"."createdAt",
  "fr"."updatedAt",
  "fr"."publishedAt",
  "fr"."resolvedAt"
FROM "InstructorApplicationFixRequest" AS "fr",
LATERAL UNNEST("fr"."editableApplicationFields") AS "field";

-- Backfill legacy fix request requirements into anchored candidate annotations.
INSERT INTO "InstructorReviewCandidateAnnotation" (
  "uuid",
  "revisionRequestUuid",
  "anchorType",
  "anchorKey",
  "body",
  "status",
  "createdByUuid",
  "updatedByUuid",
  "publishedByUuid",
  "resolvedByUuid",
  "createdAt",
  "updatedAt",
  "publishedAt",
  "resolvedAt"
)
SELECT
  (
    substring(md5("fr"."uuid"::text || ':requirement:' || "requirementUuid"), 1, 8) || '-' ||
    substring(md5("fr"."uuid"::text || ':requirement:' || "requirementUuid"), 9, 4) || '-' ||
    substring(md5("fr"."uuid"::text || ':requirement:' || "requirementUuid"), 13, 4) || '-' ||
    substring(md5("fr"."uuid"::text || ':requirement:' || "requirementUuid"), 17, 4) || '-' ||
    substring(md5("fr"."uuid"::text || ':requirement:' || "requirementUuid"), 21, 12)
  )::uuid,
  "fr"."uuid",
  'REQUIREMENT'::"InstructorReviewAnchorType",
  "requirementUuid",
  COALESCE(NULLIF(BTRIM("fr"."message"), ''), 'Legacy revision note for this requirement.'),
  ("fr"."status"::text)::"InstructorReviewCandidateAnnotationStatus",
  "fr"."createdByUuid",
  "fr"."updatedByUuid",
  "fr"."publishedByUuid",
  "fr"."resolvedByUuid",
  "fr"."createdAt",
  "fr"."updatedAt",
  "fr"."publishedAt",
  "fr"."resolvedAt"
FROM "InstructorApplicationFixRequest" AS "fr",
LATERAL UNNEST("fr"."editableRequirementUuids") AS "requirementUuid";

-- Backfill legacy top-level attachment scope into section-level candidate annotations.
INSERT INTO "InstructorReviewCandidateAnnotation" (
  "uuid",
  "revisionRequestUuid",
  "anchorType",
  "anchorKey",
  "body",
  "status",
  "createdByUuid",
  "updatedByUuid",
  "publishedByUuid",
  "resolvedByUuid",
  "createdAt",
  "updatedAt",
  "publishedAt",
  "resolvedAt"
)
SELECT
  (
    substring(md5("uuid"::text || ':section:GENERAL_ATTACHMENTS'), 1, 8) || '-' ||
    substring(md5("uuid"::text || ':section:GENERAL_ATTACHMENTS'), 9, 4) || '-' ||
    substring(md5("uuid"::text || ':section:GENERAL_ATTACHMENTS'), 13, 4) || '-' ||
    substring(md5("uuid"::text || ':section:GENERAL_ATTACHMENTS'), 17, 4) || '-' ||
    substring(md5("uuid"::text || ':section:GENERAL_ATTACHMENTS'), 21, 12)
  )::uuid,
  "uuid",
  'SECTION'::"InstructorReviewAnchorType",
  'GENERAL_ATTACHMENTS',
  COALESCE(NULLIF(BTRIM("message"), ''), 'Legacy revision note for general attachments.'),
  ("status"::text)::"InstructorReviewCandidateAnnotationStatus",
  "createdByUuid",
  "updatedByUuid",
  "publishedByUuid",
  "resolvedByUuid",
  "createdAt",
  "updatedAt",
  "publishedAt",
  "resolvedAt"
FROM "InstructorApplicationFixRequest"
WHERE "allowTopLevelAttachments" = TRUE;
