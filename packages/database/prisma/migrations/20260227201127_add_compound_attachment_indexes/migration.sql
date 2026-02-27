-- DropIndex
DROP INDEX "Attachment_instructorApplicationUuid_status_idx";

-- DropIndex
DROP INDEX "Attachment_instructorRequirementUuid_idx";

-- DropIndex
DROP INDEX "Attachment_scoutApplicationUuid_status_idx";

-- DropIndex
DROP INDEX "Attachment_scoutRequirementUuid_idx";

-- CreateIndex
CREATE INDEX "Attachment_instructorApplicationUuid_status_uploadedAt_idx" ON "Attachment"("instructorApplicationUuid", "status", "uploadedAt" DESC);

-- CreateIndex
CREATE INDEX "Attachment_scoutApplicationUuid_status_uploadedAt_idx" ON "Attachment"("scoutApplicationUuid", "status", "uploadedAt" DESC);

-- CreateIndex
CREATE INDEX "Attachment_instructorRequirementUuid_status_uploadedAt_idx" ON "Attachment"("instructorRequirementUuid", "status", "uploadedAt" DESC);

-- CreateIndex
CREATE INDEX "Attachment_scoutRequirementUuid_status_uploadedAt_idx" ON "Attachment"("scoutRequirementUuid", "status", "uploadedAt" DESC);
