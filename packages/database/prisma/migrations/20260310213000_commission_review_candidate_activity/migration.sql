-- @file: packages/database/prisma/migrations/20260310213000_commission_review_candidate_activity/migration.sql
ALTER TABLE "InstructorReviewInternalNote"
ADD COLUMN "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE "InstructorReviewRevisionRequest"
ADD COLUMN "candidateFirstViewedAt" TIMESTAMPTZ,
ADD COLUMN "candidateFirstEditedAt" TIMESTAMPTZ,
ADD COLUMN "candidateLastActivityAt" TIMESTAMPTZ;
