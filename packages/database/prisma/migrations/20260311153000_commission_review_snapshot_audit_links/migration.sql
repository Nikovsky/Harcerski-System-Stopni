-- @file: packages/database/prisma/migrations/20260311153000_commission_review_snapshot_audit_links/migration.sql
ALTER TABLE "InstructorReviewRevisionRequest"
ADD COLUMN "baselineSnapshotUuid" UUID,
ADD COLUMN "responseSnapshotUuid" UUID;

ALTER TABLE "InstructorReviewRevisionRequest"
ADD CONSTRAINT "InstructorReviewRevisionRequest_baselineSnapshotUuid_fkey"
FOREIGN KEY ("baselineSnapshotUuid")
REFERENCES "InstructorApplicationSnapshot"("uuid")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "InstructorReviewRevisionRequest"
ADD CONSTRAINT "InstructorReviewRevisionRequest_responseSnapshotUuid_fkey"
FOREIGN KEY ("responseSnapshotUuid")
REFERENCES "InstructorApplicationSnapshot"("uuid")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE INDEX "InstructorReviewRevisionRequest_baselineSnapshotUuid_idx"
ON "InstructorReviewRevisionRequest"("baselineSnapshotUuid");

CREATE INDEX "InstructorReviewRevisionRequest_responseSnapshotUuid_idx"
ON "InstructorReviewRevisionRequest"("responseSnapshotUuid");
