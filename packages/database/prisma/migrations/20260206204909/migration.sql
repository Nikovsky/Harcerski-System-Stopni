-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ROOT', 'SYSTEM', 'ADMIN', 'COMMISSION_CHAIR', 'COMMISSION_SECRETARY', 'COMMISSION_MEMBER', 'SCOUT', 'USER', 'NONE');

-- CreateEnum
CREATE TYPE "ScoutRank" AS ENUM ('MLODZIK', 'WYWIADOWCA', 'CWIK', 'HARCERZ_ORLI', 'HARCERZ_RZECZYPOSPOLITEJ');

-- CreateEnum
CREATE TYPE "InstructorRank" AS ENUM ('PRZEWODNIK', 'PODHARCMISTRZ_OTWARTA_PROBA', 'PODHARCMISTRZ', 'HARCMISTRZ');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'TO_FIX', 'UNDER_REVIEW', 'APPROVED', 'IN_PROGRESS', 'REPORT_SUBMITTED', 'COMPLETED_POSITIVE', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PresenceType" AS ENUM ('IN_PERSON', 'REMOTE', 'ATTACHMENT_OPINION');

-- CreateEnum
CREATE TYPE "UnitType" AS ENUM ('HUFIEC', 'DRUZYNA');

-- CreateEnum
CREATE TYPE "RequirementState" AS ENUM ('DONE', 'PLANNED');

-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('DRAFT', 'OPEN_FOR_REGISTRATION', 'CLOSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('REGISTERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SlotMode" AS ENUM ('SLOTS', 'DAY_ONLY');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('MEETING_PROTOCOL', 'DECISION', 'OTHER');

-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('INSTRUCTOR', 'SCOUT');

-- CreateEnum
CREATE TYPE "CommissionRole" AS ENUM ('CHAIRMAN', 'SECRETARY', 'MEMBER');

-- CreateEnum
CREATE TYPE "DegreeType" AS ENUM ('INSTRUCTOR', 'SCOUT');

-- CreateTable
CREATE TABLE "User" (
    "uuid" UUID NOT NULL,
    "keycloakUuid" UUID NOT NULL,
    "firstName" VARCHAR(32) NOT NULL,
    "secondName" VARCHAR(32),
    "surname" VARCHAR(32) NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "phone" VARCHAR(16) NOT NULL,
    "birthDate" DATE NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "hufiecCode" VARCHAR(32),
    "druzynaCode" VARCHAR(32),
    "scoutRank" "ScoutRank",
    "scoutRankAwardedAt" DATE,
    "instructorRank" "InstructorRank",
    "instructorRankAwardedAt" DATE,
    "inScoutingSince" DATE,
    "inZhrSince" DATE,
    "oathDate" DATE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "ScoutUnit" (
    "uuid" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "type" "UnitType" NOT NULL,
    "parentHufiecCode" VARCHAR(32),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ScoutUnit_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "Commission" (
    "uuid" UUID NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "type" "CommissionType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Commission_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "CommissionMember" (
    "uuid" UUID NOT NULL,
    "commissionUuid" UUID NOT NULL,
    "userUuid" UUID NOT NULL,
    "role" "CommissionRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMPTZ,

    CONSTRAINT "CommissionMember_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "RequirementTemplate" (
    "uuid" UUID NOT NULL,
    "degreeType" "DegreeType" NOT NULL,
    "degreeCode" VARCHAR(32) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "name" VARCHAR(128),
    "description" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequirementTemplate_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "RequirementDefinition" (
    "uuid" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "code" VARCHAR(8) NOT NULL,
    "description" TEXT NOT NULL,
    "isGroup" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL,
    "parentId" UUID,

    CONSTRAINT "RequirementDefinition_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "InstructorApplication" (
    "uuid" UUID NOT NULL,
    "candidateUuid" UUID NOT NULL,
    "templateUuid" UUID NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "targetDegree" "InstructorRank",
    "plannedFinishAt" DATE,
    "teamFunction" VARCHAR(64),
    "hufiecFunction" VARCHAR(64),
    "openTrialForRank" "InstructorRank",
    "openTrialDeadline" DATE,
    "hufcowyPresence" "PresenceType",
    "hufcowyPresenceAttachmentUuid" UUID,
    "functionsHistory" TEXT,
    "coursesHistory" TEXT,
    "campsHistory" TEXT,
    "successes" TEXT,
    "failures" TEXT,
    "supervisorFirstName" VARCHAR(32),
    "supervisorSecondName" VARCHAR(32),
    "supervisorSurname" VARCHAR(32),
    "supervisorInstructorRank" "InstructorRank",
    "supervisorInstructorFunction" VARCHAR(64),
    "finalReportAttachmentUuid" UUID,
    "lastSubmittedAt" TIMESTAMPTZ,
    "approvedAt" TIMESTAMPTZ,
    "archivedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "InstructorApplication_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "InstructorApplicationSnapshot" (
    "uuid" UUID NOT NULL,
    "applicationUuid" UUID NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "submittedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "templateUuid" UUID NOT NULL,
    "templateVersion" INTEGER NOT NULL,
    "candidateSnapshot" JSONB NOT NULL,
    "requirementsSnapshot" JSONB NOT NULL,
    "attachmentsMetadata" JSONB NOT NULL,
    "applicationDataSnapshot" JSONB NOT NULL,
    "candidateFirstName" VARCHAR(32) NOT NULL,
    "candidateSurname" VARCHAR(32) NOT NULL,
    "candidateEmailAtSubmit" VARCHAR(320) NOT NULL,
    "hufiecCodeAtSubmit" VARCHAR(32),
    "druzynaCodeAtSubmit" VARCHAR(32),
    "statusAtSubmit" "ApplicationStatus" NOT NULL,

    CONSTRAINT "InstructorApplicationSnapshot_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "InstructorApplicationRequirement" (
    "uuid" UUID NOT NULL,
    "applicationUuid" UUID NOT NULL,
    "requirementDefinitionUuid" UUID NOT NULL,
    "state" "RequirementState" NOT NULL,
    "actionDescription" TEXT NOT NULL,
    "verificationText" TEXT,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "InstructorApplicationRequirement_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "ScoutApplication" (
    "uuid" UUID NOT NULL,
    "candidateUuid" UUID NOT NULL,
    "templateUuid" UUID NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "targetRank" "ScoutRank",
    "plannedFinishAt" DATE,
    "function" VARCHAR(64),
    "whatIsExploit" TEXT,
    "whatIsService" TEXT,
    "changesLog" TEXT,
    "supervisorFirstName" VARCHAR(32),
    "supervisorSecondName" VARCHAR(32),
    "supervisorSurname" VARCHAR(32),
    "supervisorInstructorRank" "InstructorRank",
    "finalReportAttachmentUuid" UUID,
    "lastSubmittedAt" TIMESTAMPTZ,
    "approvedAt" TIMESTAMPTZ,
    "archivedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ScoutApplication_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "ScoutApplicationSnapshot" (
    "uuid" UUID NOT NULL,
    "applicationUuid" UUID NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "submittedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "templateUuid" UUID NOT NULL,
    "templateVersion" INTEGER NOT NULL,
    "candidateSnapshot" JSONB NOT NULL,
    "requirementsSnapshot" JSONB NOT NULL,
    "attachmentsMetadata" JSONB NOT NULL,
    "applicationDataSnapshot" JSONB NOT NULL,
    "candidateFirstName" VARCHAR(32) NOT NULL,
    "candidateSurname" VARCHAR(32) NOT NULL,
    "candidateEmailAtSubmit" VARCHAR(320) NOT NULL,
    "hufiecCodeAtSubmit" VARCHAR(32),
    "druzynaCodeAtSubmit" VARCHAR(32),
    "statusAtSubmit" "ApplicationStatus" NOT NULL,

    CONSTRAINT "ScoutApplicationSnapshot_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "ScoutApplicationRequirement" (
    "uuid" UUID NOT NULL,
    "applicationUuid" UUID NOT NULL,
    "requirementDefinitionUuid" UUID NOT NULL,
    "state" "RequirementState" NOT NULL,
    "actionDescription" TEXT NOT NULL,
    "verificationMethod" TEXT NOT NULL,
    "verificationText" TEXT,
    "plannedStartDate" DATE,
    "plannedEndDate" DATE,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ScoutApplicationRequirement_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "uuid" UUID NOT NULL,
    "instructorApplicationUuid" UUID,
    "scoutApplicationUuid" UUID,
    "instructorRequirementUuid" UUID,
    "scoutRequirementUuid" UUID,
    "objectKey" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "contentType" VARCHAR(255) NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "checksum" VARCHAR(128),
    "checksumAlgorithm" VARCHAR(16) DEFAULT 'SHA256',
    "uploadedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "ApplicationComment" (
    "uuid" UUID NOT NULL,
    "instructorApplicationUuid" UUID,
    "scoutApplicationUuid" UUID,
    "instructorRequirementUuid" UUID,
    "scoutRequirementUuid" UUID,
    "body" TEXT NOT NULL,
    "authorUuid" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationComment_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "CommissionMeeting" (
    "uuid" UUID NOT NULL,
    "commissionUuid" UUID NOT NULL,
    "createdByUuid" UUID NOT NULL,
    "date" DATE NOT NULL,
    "slotMode" "SlotMode" NOT NULL,
    "status" "MeetingStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "CommissionMeeting_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "MeetingSlot" (
    "uuid" UUID NOT NULL,
    "meetingUuid" UUID NOT NULL,
    "startTime" TIMESTAMPTZ NOT NULL,
    "endTime" TIMESTAMPTZ NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "MeetingSlot_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "MeetingRegistration" (
    "uuid" UUID NOT NULL,
    "meetingUuid" UUID NOT NULL,
    "instructorApplicationUuid" UUID,
    "scoutApplicationUuid" UUID,
    "candidateUuid" UUID NOT NULL,
    "slotUuid" UUID,
    "assignedTime" TIMESTAMPTZ,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'REGISTERED',
    "registeredAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "MeetingRegistration_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "CommissionDocument" (
    "uuid" UUID NOT NULL,
    "uploadedByUuid" UUID NOT NULL,
    "meetingUuid" UUID,
    "documentType" "DocumentType" NOT NULL,
    "description" TEXT,
    "objectKey" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "contentType" VARCHAR(255) NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "checksum" VARCHAR(128),
    "checksumAlgorithm" VARCHAR(16) DEFAULT 'SHA256',
    "uploadedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionDocument_pkey" PRIMARY KEY ("uuid")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_keycloakUuid_key" ON "User"("keycloakUuid");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_hufiecCode_idx" ON "User"("hufiecCode");

-- CreateIndex
CREATE INDEX "User_druzynaCode_idx" ON "User"("druzynaCode");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_keycloakUuid_idx" ON "User"("keycloakUuid");

-- CreateIndex
CREATE INDEX "User_isDeleted_idx" ON "User"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "ScoutUnit_code_key" ON "ScoutUnit"("code");

-- CreateIndex
CREATE INDEX "ScoutUnit_type_idx" ON "ScoutUnit"("type");

-- CreateIndex
CREATE INDEX "ScoutUnit_parentHufiecCode_idx" ON "ScoutUnit"("parentHufiecCode");

-- CreateIndex
CREATE INDEX "Commission_type_isActive_idx" ON "Commission"("type", "isActive");

-- CreateIndex
CREATE INDEX "CommissionMember_userUuid_idx" ON "CommissionMember"("userUuid");

-- CreateIndex
CREATE INDEX "CommissionMember_commissionUuid_idx" ON "CommissionMember"("commissionUuid");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionMember_commissionUuid_userUuid_key" ON "CommissionMember"("commissionUuid", "userUuid");

-- CreateIndex
CREATE INDEX "RequirementTemplate_degreeType_degreeCode_isActive_idx" ON "RequirementTemplate"("degreeType", "degreeCode", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "RequirementTemplate_degreeType_degreeCode_version_key" ON "RequirementTemplate"("degreeType", "degreeCode", "version");

-- CreateIndex
CREATE INDEX "RequirementDefinition_templateId_sortOrder_idx" ON "RequirementDefinition"("templateId", "sortOrder");

-- CreateIndex
CREATE INDEX "RequirementDefinition_parentId_idx" ON "RequirementDefinition"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "RequirementDefinition_templateId_code_key" ON "RequirementDefinition"("templateId", "code");

-- CreateIndex
CREATE INDEX "InstructorApplication_candidateUuid_status_updatedAt_idx" ON "InstructorApplication"("candidateUuid", "status", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "InstructorApplication_status_updatedAt_idx" ON "InstructorApplication"("status", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "InstructorApplication_templateUuid_idx" ON "InstructorApplication"("templateUuid");

-- CreateIndex
CREATE INDEX "InstructorApplicationSnapshot_applicationUuid_submittedAt_idx" ON "InstructorApplicationSnapshot"("applicationUuid", "submittedAt" DESC);

-- CreateIndex
CREATE INDEX "InstructorApplicationSnapshot_templateUuid_templateVersion_idx" ON "InstructorApplicationSnapshot"("templateUuid", "templateVersion");

-- CreateIndex
CREATE INDEX "InstructorApplicationSnapshot_statusAtSubmit_idx" ON "InstructorApplicationSnapshot"("statusAtSubmit");

-- CreateIndex
CREATE INDEX "InstructorApplicationSnapshot_candidateSurname_candidateFir_idx" ON "InstructorApplicationSnapshot"("candidateSurname", "candidateFirstName");

-- CreateIndex
CREATE INDEX "InstructorApplicationSnapshot_candidateEmailAtSubmit_idx" ON "InstructorApplicationSnapshot"("candidateEmailAtSubmit");

-- CreateIndex
CREATE UNIQUE INDEX "InstructorApplicationSnapshot_applicationUuid_revision_key" ON "InstructorApplicationSnapshot"("applicationUuid", "revision");

-- CreateIndex
CREATE INDEX "InstructorApplicationRequirement_applicationUuid_idx" ON "InstructorApplicationRequirement"("applicationUuid");

-- CreateIndex
CREATE UNIQUE INDEX "InstructorApplicationRequirement_applicationUuid_requiremen_key" ON "InstructorApplicationRequirement"("applicationUuid", "requirementDefinitionUuid");

-- CreateIndex
CREATE INDEX "ScoutApplication_candidateUuid_status_updatedAt_idx" ON "ScoutApplication"("candidateUuid", "status", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "ScoutApplication_status_updatedAt_idx" ON "ScoutApplication"("status", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "ScoutApplication_templateUuid_idx" ON "ScoutApplication"("templateUuid");

-- CreateIndex
CREATE INDEX "ScoutApplicationSnapshot_applicationUuid_submittedAt_idx" ON "ScoutApplicationSnapshot"("applicationUuid", "submittedAt" DESC);

-- CreateIndex
CREATE INDEX "ScoutApplicationSnapshot_templateUuid_templateVersion_idx" ON "ScoutApplicationSnapshot"("templateUuid", "templateVersion");

-- CreateIndex
CREATE INDEX "ScoutApplicationSnapshot_statusAtSubmit_idx" ON "ScoutApplicationSnapshot"("statusAtSubmit");

-- CreateIndex
CREATE INDEX "ScoutApplicationSnapshot_candidateSurname_candidateFirstNam_idx" ON "ScoutApplicationSnapshot"("candidateSurname", "candidateFirstName");

-- CreateIndex
CREATE INDEX "ScoutApplicationSnapshot_candidateEmailAtSubmit_idx" ON "ScoutApplicationSnapshot"("candidateEmailAtSubmit");

-- CreateIndex
CREATE UNIQUE INDEX "ScoutApplicationSnapshot_applicationUuid_revision_key" ON "ScoutApplicationSnapshot"("applicationUuid", "revision");

-- CreateIndex
CREATE INDEX "ScoutApplicationRequirement_applicationUuid_idx" ON "ScoutApplicationRequirement"("applicationUuid");

-- CreateIndex
CREATE UNIQUE INDEX "ScoutApplicationRequirement_applicationUuid_requirementDefi_key" ON "ScoutApplicationRequirement"("applicationUuid", "requirementDefinitionUuid");

-- CreateIndex
CREATE UNIQUE INDEX "Attachment_objectKey_key" ON "Attachment"("objectKey");

-- CreateIndex
CREATE INDEX "ApplicationComment_instructorApplicationUuid_createdAt_idx" ON "ApplicationComment"("instructorApplicationUuid", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ApplicationComment_scoutApplicationUuid_createdAt_idx" ON "ApplicationComment"("scoutApplicationUuid", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ApplicationComment_instructorRequirementUuid_idx" ON "ApplicationComment"("instructorRequirementUuid");

-- CreateIndex
CREATE INDEX "ApplicationComment_scoutRequirementUuid_idx" ON "ApplicationComment"("scoutRequirementUuid");

-- CreateIndex
CREATE INDEX "ApplicationComment_authorUuid_idx" ON "ApplicationComment"("authorUuid");

-- CreateIndex
CREATE INDEX "CommissionMeeting_commissionUuid_date_status_idx" ON "CommissionMeeting"("commissionUuid", "date", "status");

-- CreateIndex
CREATE INDEX "CommissionMeeting_status_idx" ON "CommissionMeeting"("status");

-- CreateIndex
CREATE INDEX "MeetingSlot_meetingUuid_sortOrder_idx" ON "MeetingSlot"("meetingUuid", "sortOrder");

-- CreateIndex
CREATE INDEX "MeetingRegistration_meetingUuid_status_idx" ON "MeetingRegistration"("meetingUuid", "status");

-- CreateIndex
CREATE INDEX "MeetingRegistration_candidateUuid_status_idx" ON "MeetingRegistration"("candidateUuid", "status");

-- CreateIndex
CREATE INDEX "MeetingRegistration_instructorApplicationUuid_idx" ON "MeetingRegistration"("instructorApplicationUuid");

-- CreateIndex
CREATE INDEX "MeetingRegistration_scoutApplicationUuid_idx" ON "MeetingRegistration"("scoutApplicationUuid");

-- CreateIndex
CREATE INDEX "MeetingRegistration_slotUuid_status_idx" ON "MeetingRegistration"("slotUuid", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionDocument_objectKey_key" ON "CommissionDocument"("objectKey");

-- CreateIndex
CREATE INDEX "CommissionDocument_meetingUuid_idx" ON "CommissionDocument"("meetingUuid");

-- CreateIndex
CREATE INDEX "CommissionDocument_documentType_idx" ON "CommissionDocument"("documentType");

-- CreateIndex
CREATE INDEX "CommissionDocument_uploadedByUuid_idx" ON "CommissionDocument"("uploadedByUuid");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_hufiecCode_fkey" FOREIGN KEY ("hufiecCode") REFERENCES "ScoutUnit"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_druzynaCode_fkey" FOREIGN KEY ("druzynaCode") REFERENCES "ScoutUnit"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoutUnit" ADD CONSTRAINT "ScoutUnit_parentHufiecCode_fkey" FOREIGN KEY ("parentHufiecCode") REFERENCES "ScoutUnit"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionMember" ADD CONSTRAINT "CommissionMember_commissionUuid_fkey" FOREIGN KEY ("commissionUuid") REFERENCES "Commission"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionMember" ADD CONSTRAINT "CommissionMember_userUuid_fkey" FOREIGN KEY ("userUuid") REFERENCES "User"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementDefinition" ADD CONSTRAINT "RequirementDefinition_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "RequirementTemplate"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementDefinition" ADD CONSTRAINT "RequirementDefinition_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "RequirementDefinition"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorApplication" ADD CONSTRAINT "InstructorApplication_candidateUuid_fkey" FOREIGN KEY ("candidateUuid") REFERENCES "User"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorApplication" ADD CONSTRAINT "InstructorApplication_templateUuid_fkey" FOREIGN KEY ("templateUuid") REFERENCES "RequirementTemplate"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorApplication" ADD CONSTRAINT "InstructorApplication_hufcowyPresenceAttachmentUuid_fkey" FOREIGN KEY ("hufcowyPresenceAttachmentUuid") REFERENCES "Attachment"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorApplication" ADD CONSTRAINT "InstructorApplication_finalReportAttachmentUuid_fkey" FOREIGN KEY ("finalReportAttachmentUuid") REFERENCES "Attachment"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorApplicationSnapshot" ADD CONSTRAINT "InstructorApplicationSnapshot_applicationUuid_fkey" FOREIGN KEY ("applicationUuid") REFERENCES "InstructorApplication"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorApplicationRequirement" ADD CONSTRAINT "InstructorApplicationRequirement_applicationUuid_fkey" FOREIGN KEY ("applicationUuid") REFERENCES "InstructorApplication"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorApplicationRequirement" ADD CONSTRAINT "InstructorApplicationRequirement_requirementDefinitionUuid_fkey" FOREIGN KEY ("requirementDefinitionUuid") REFERENCES "RequirementDefinition"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoutApplication" ADD CONSTRAINT "ScoutApplication_candidateUuid_fkey" FOREIGN KEY ("candidateUuid") REFERENCES "User"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoutApplication" ADD CONSTRAINT "ScoutApplication_templateUuid_fkey" FOREIGN KEY ("templateUuid") REFERENCES "RequirementTemplate"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoutApplication" ADD CONSTRAINT "ScoutApplication_finalReportAttachmentUuid_fkey" FOREIGN KEY ("finalReportAttachmentUuid") REFERENCES "Attachment"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoutApplicationSnapshot" ADD CONSTRAINT "ScoutApplicationSnapshot_applicationUuid_fkey" FOREIGN KEY ("applicationUuid") REFERENCES "ScoutApplication"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoutApplicationRequirement" ADD CONSTRAINT "ScoutApplicationRequirement_applicationUuid_fkey" FOREIGN KEY ("applicationUuid") REFERENCES "ScoutApplication"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoutApplicationRequirement" ADD CONSTRAINT "ScoutApplicationRequirement_requirementDefinitionUuid_fkey" FOREIGN KEY ("requirementDefinitionUuid") REFERENCES "RequirementDefinition"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_instructorApplicationUuid_fkey" FOREIGN KEY ("instructorApplicationUuid") REFERENCES "InstructorApplication"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_scoutApplicationUuid_fkey" FOREIGN KEY ("scoutApplicationUuid") REFERENCES "ScoutApplication"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_instructorRequirementUuid_fkey" FOREIGN KEY ("instructorRequirementUuid") REFERENCES "InstructorApplicationRequirement"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_scoutRequirementUuid_fkey" FOREIGN KEY ("scoutRequirementUuid") REFERENCES "ScoutApplicationRequirement"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationComment" ADD CONSTRAINT "ApplicationComment_instructorApplicationUuid_fkey" FOREIGN KEY ("instructorApplicationUuid") REFERENCES "InstructorApplication"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationComment" ADD CONSTRAINT "ApplicationComment_scoutApplicationUuid_fkey" FOREIGN KEY ("scoutApplicationUuid") REFERENCES "ScoutApplication"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationComment" ADD CONSTRAINT "ApplicationComment_instructorRequirementUuid_fkey" FOREIGN KEY ("instructorRequirementUuid") REFERENCES "InstructorApplicationRequirement"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationComment" ADD CONSTRAINT "ApplicationComment_scoutRequirementUuid_fkey" FOREIGN KEY ("scoutRequirementUuid") REFERENCES "ScoutApplicationRequirement"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationComment" ADD CONSTRAINT "ApplicationComment_authorUuid_fkey" FOREIGN KEY ("authorUuid") REFERENCES "User"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionMeeting" ADD CONSTRAINT "CommissionMeeting_commissionUuid_fkey" FOREIGN KEY ("commissionUuid") REFERENCES "Commission"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionMeeting" ADD CONSTRAINT "CommissionMeeting_createdByUuid_fkey" FOREIGN KEY ("createdByUuid") REFERENCES "User"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingSlot" ADD CONSTRAINT "MeetingSlot_meetingUuid_fkey" FOREIGN KEY ("meetingUuid") REFERENCES "CommissionMeeting"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingRegistration" ADD CONSTRAINT "MeetingRegistration_meetingUuid_fkey" FOREIGN KEY ("meetingUuid") REFERENCES "CommissionMeeting"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingRegistration" ADD CONSTRAINT "MeetingRegistration_instructorApplicationUuid_fkey" FOREIGN KEY ("instructorApplicationUuid") REFERENCES "InstructorApplication"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingRegistration" ADD CONSTRAINT "MeetingRegistration_scoutApplicationUuid_fkey" FOREIGN KEY ("scoutApplicationUuid") REFERENCES "ScoutApplication"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingRegistration" ADD CONSTRAINT "MeetingRegistration_candidateUuid_fkey" FOREIGN KEY ("candidateUuid") REFERENCES "User"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingRegistration" ADD CONSTRAINT "MeetingRegistration_slotUuid_fkey" FOREIGN KEY ("slotUuid") REFERENCES "MeetingSlot"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionDocument" ADD CONSTRAINT "CommissionDocument_uploadedByUuid_fkey" FOREIGN KEY ("uploadedByUuid") REFERENCES "User"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionDocument" ADD CONSTRAINT "CommissionDocument_meetingUuid_fkey" FOREIGN KEY ("meetingUuid") REFERENCES "CommissionMeeting"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Attachment_instructorApplicationUuid_not_null_idx"
  ON "Attachment" ("instructorApplicationUuid")
  WHERE "instructorApplicationUuid" IS NOT NULL;

CREATE INDEX "Attachment_scoutApplicationUuid_not_null_idx"
  ON "Attachment" ("scoutApplicationUuid")
  WHERE "scoutApplicationUuid" IS NOT NULL;

CREATE INDEX "Attachment_instructorRequirementUuid_not_null_idx"
  ON "Attachment" ("instructorRequirementUuid")
  WHERE "instructorRequirementUuid" IS NOT NULL;

CREATE INDEX "Attachment_scoutRequirementUuid_not_null_idx"
  ON "Attachment" ("scoutRequirementUuid")
  WHERE "scoutRequirementUuid" IS NOT NULL;