-- @file: packages/database/prisma/migrations/20260310130000_commission_review_fix_requests/migration.sql
CREATE TYPE "InstructorFixRequestStatus" AS ENUM (
  'DRAFT',
  'PUBLISHED',
  'RESOLVED',
  'CANCELLED'
);

CREATE TABLE "InstructorApplicationFixRequest" (
  "uuid" UUID NOT NULL,
  "applicationUuid" UUID NOT NULL,
  "status" "InstructorFixRequestStatus" NOT NULL DEFAULT 'DRAFT',
  "message" TEXT,
  "editableApplicationFields" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "editableRequirementUuids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "allowTopLevelAttachments" BOOLEAN NOT NULL DEFAULT false,
  "createdByUuid" UUID NOT NULL,
  "updatedByUuid" UUID,
  "publishedByUuid" UUID,
  "resolvedByUuid" UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "publishedAt" TIMESTAMPTZ,
  "resolvedAt" TIMESTAMPTZ,

  CONSTRAINT "InstructorApplicationFixRequest_pkey" PRIMARY KEY ("uuid")
);

CREATE INDEX "InstructorApplicationFixRequest_applicationUuid_status_updatedAt_idx"
ON "InstructorApplicationFixRequest"("applicationUuid", "status", "updatedAt" DESC);

CREATE INDEX "InstructorApplicationFixRequest_createdByUuid_createdAt_idx"
ON "InstructorApplicationFixRequest"("createdByUuid", "createdAt" DESC);

CREATE INDEX "InstructorApplicationFixRequest_publishedByUuid_publishedAt_idx"
ON "InstructorApplicationFixRequest"("publishedByUuid", "publishedAt" DESC);

CREATE UNIQUE INDEX "InstructorApplicationFixRequest_single_open_idx"
ON "InstructorApplicationFixRequest"("applicationUuid")
WHERE "status" IN ('DRAFT', 'PUBLISHED');

ALTER TABLE "InstructorApplicationFixRequest"
ADD CONSTRAINT "InstructorApplicationFixRequest_applicationUuid_fkey"
FOREIGN KEY ("applicationUuid")
REFERENCES "InstructorApplication"("uuid")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "InstructorApplicationFixRequest"
ADD CONSTRAINT "InstructorApplicationFixRequest_createdByUuid_fkey"
FOREIGN KEY ("createdByUuid")
REFERENCES "User"("uuid")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "InstructorApplicationFixRequest"
ADD CONSTRAINT "InstructorApplicationFixRequest_updatedByUuid_fkey"
FOREIGN KEY ("updatedByUuid")
REFERENCES "User"("uuid")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "InstructorApplicationFixRequest"
ADD CONSTRAINT "InstructorApplicationFixRequest_publishedByUuid_fkey"
FOREIGN KEY ("publishedByUuid")
REFERENCES "User"("uuid")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "InstructorApplicationFixRequest"
ADD CONSTRAINT "InstructorApplicationFixRequest_resolvedByUuid_fkey"
FOREIGN KEY ("resolvedByUuid")
REFERENCES "User"("uuid")
ON DELETE SET NULL
ON UPDATE CASCADE;
