-- CreateIndex
CREATE INDEX "Attachment_instructorApplicationUuid_status_idx" ON "Attachment"("instructorApplicationUuid", "status");

-- CreateIndex
CREATE INDEX "Attachment_scoutApplicationUuid_status_idx" ON "Attachment"("scoutApplicationUuid", "status");

-- CreateIndex
CREATE INDEX "Attachment_instructorRequirementUuid_idx" ON "Attachment"("instructorRequirementUuid");

-- CreateIndex
CREATE INDEX "Attachment_scoutRequirementUuid_idx" ON "Attachment"("scoutRequirementUuid");
