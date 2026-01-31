-- CreateEnum
CREATE TYPE "ScoutRankEnum" AS ENUM ('CWIK', 'HARCERZ_ORLI', 'HARCERZ_RZECZYPOSPOLITEJ');

-- CreateEnum
CREATE TYPE "InstructorRankEnum" AS ENUM ('PRZEWODNIK', 'PODHARCMISTRZ', 'HARCMISTRZ');

-- CreateEnum
CREATE TYPE "superVisiorInstructorRankEnum" AS ENUM ('PRZEWODNIK', 'OTWARTY_PODHARCMISTRZ', 'PODHARCMISTRZ', 'HARCMISTRZ');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'TO_FIX', 'APPROVED', 'ARCHIVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PresenceType" AS ENUM ('IN_PERSON', 'REMOTE', 'ATTACHMENT_OPINION');

-- CreateEnum
CREATE TYPE "UnitType" AS ENUM ('HUFIEC', 'DRUZYNA');

-- CreateEnum
CREATE TYPE "RequirementState" AS ENUM ('DONE', 'PLANNED');

-- CreateTable
CREATE TABLE "UserPersonalDate" (
    "uuid" UUID NOT NULL,
    "KeyCloakUuid" UUID NOT NULL,
    "fristName" TEXT NOT NULL,
    "secondName" TEXT NOT NULL,
    "surnName" TEXT NOT NULL,
    "birthDate" DATE NOT NULL,
    "email" TEXT NOT NULL,
    "phoneNum" TEXT NOT NULL,
    "hufiecCode" VARCHAR(32) NOT NULL,
    "druzynaCode" VARCHAR(32) NOT NULL,
    "teamFunction" TEXT,
    "hufiecFunction" TEXT,
    "scoutRank" "ScoutRankEnum" NOT NULL,
    "scoutRankAwardedAt" DATE NOT NULL,
    "inScoutingSince" DATE NOT NULL,
    "inZHRSince" DATE NOT NULL,
    "oathDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPersonalDate_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "ScoutUnit" (
    "uuid" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" TEXT NOT NULL,
    "type" "UnitType" NOT NULL,
    "parentCode" VARCHAR(32),

    CONSTRAINT "ScoutUnit_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "RequirementTemplate" (
    "uuid" UUID NOT NULL,
    "degreeCode" "InstructorRankEnum" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequirementTemplate_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "RequirementDefinition" (
    "uuid" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "code" VARCHAR(4) NOT NULL,
    "description" TEXT NOT NULL,
    "isGroup" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL,
    "parentId" UUID,

    CONSTRAINT "RequirementDefinition_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "Application" (
    "uuid" UUID NOT NULL,
    "candidateUuid" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "lastSubmittedAt" TIMESTAMP(3),
    "targetDegree" "InstructorRankEnum" NOT NULL,
    "plannedFinishAt" DATE,
    "hufiecPresence" "PresenceType",
    "serviceHistory" TEXT,
    "coursesHistory" TEXT,
    "CampsHistory" TEXT,
    "successes" TEXT,
    "failures" TEXT,
    "superVisiorFirstName" TEXT,
    "superVisiorSecondName" TEXT,
    "superVisiorSurnName" TEXT,
    "superVisiorInstructorRank" "superVisiorInstructorRankEnum",
    "superVisiorFunction" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "ApplicationAsSubmitted" (
    "applicationUuid" UUID NOT NULL,
    "revision" INTEGER NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "emailAtSubmit" VARCHAR(32) NOT NULL,
    "phoneAtSubmit" TEXT NOT NULL,
    "hufiecCodeAtSubmit" VARCHAR(32) NOT NULL,
    "druzynaCodeAtSubmit" VARCHAR(32) NOT NULL,
    "scoutRankAtSubmit" "ScoutRankEnum" NOT NULL,
    "scoutRankAwardedAtSubmit" DATE,
    "scoutUnitUuid" UUID,

    CONSTRAINT "ApplicationAsSubmitted_pkey" PRIMARY KEY ("applicationUuid")
);

-- CreateTable
CREATE TABLE "ApplicationRequirement" (
    "uuid" UUID NOT NULL,
    "applicationUuid" UUID NOT NULL,
    "requirementDefinitionUuid" UUID NOT NULL,
    "state" "RequirementState" NOT NULL,
    "actionDescription" TEXT NOT NULL,
    "verificationText" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationRequirement_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" UUID NOT NULL,
    "applicationRequirementUuid" UUID NOT NULL,
    "objectKey" TEXT NOT NULL,
    "checkSum" TEXT,
    "checksumAlgorithm" VARCHAR(16) DEFAULT 'SHA256',
    "contentType" VARCHAR(255) NOT NULL,
    "sizesBytes" BIGINT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationComment" (
    "uuid" UUID NOT NULL,
    "applicationUuid" UUID NOT NULL,
    "relatedRequirementUuid" UUID,
    "body" TEXT NOT NULL,
    "authorComissionUserUuid" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationComment_pkey" PRIMARY KEY ("uuid")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPersonalDate_KeyCloakUuid_key" ON "UserPersonalDate"("KeyCloakUuid");

-- CreateIndex
CREATE UNIQUE INDEX "UserPersonalDate_email_key" ON "UserPersonalDate"("email");

-- CreateIndex
CREATE INDEX "UserPersonalDate_hufiecCode_idx" ON "UserPersonalDate"("hufiecCode");

-- CreateIndex
CREATE INDEX "UserPersonalDate_druzynaCode_idx" ON "UserPersonalDate"("druzynaCode");

-- CreateIndex
CREATE UNIQUE INDEX "ScoutUnit_code_key" ON "ScoutUnit"("code");

-- CreateIndex
CREATE INDEX "ScoutUnit_type_idx" ON "ScoutUnit"("type");

-- CreateIndex
CREATE INDEX "ScoutUnit_parentCode_idx" ON "ScoutUnit"("parentCode");

-- CreateIndex
CREATE UNIQUE INDEX "RequirementTemplate_degreeCode_key" ON "RequirementTemplate"("degreeCode");

-- CreateIndex
CREATE INDEX "RequirementDefinition_templateId_sortOrder_idx" ON "RequirementDefinition"("templateId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "RequirementDefinition_templateId_code_key" ON "RequirementDefinition"("templateId", "code");

-- CreateIndex
CREATE INDEX "Application_candidateUuid_updatedAt_idx" ON "Application"("candidateUuid", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "Application_status_updatedAt_idx" ON "Application"("status", "updatedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationRequirement_applicationUuid_requirementDefinitio_key" ON "ApplicationRequirement"("applicationUuid", "requirementDefinitionUuid");

-- CreateIndex
CREATE UNIQUE INDEX "Attachment_objectKey_key" ON "Attachment"("objectKey");

-- AddForeignKey
ALTER TABLE "UserPersonalDate" ADD CONSTRAINT "UserPersonalDate_hufiecCode_fkey" FOREIGN KEY ("hufiecCode") REFERENCES "ScoutUnit"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPersonalDate" ADD CONSTRAINT "UserPersonalDate_druzynaCode_fkey" FOREIGN KEY ("druzynaCode") REFERENCES "ScoutUnit"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoutUnit" ADD CONSTRAINT "ScoutUnit_parentCode_fkey" FOREIGN KEY ("parentCode") REFERENCES "ScoutUnit"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementDefinition" ADD CONSTRAINT "RequirementDefinition_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "RequirementTemplate"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementDefinition" ADD CONSTRAINT "RequirementDefinition_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "RequirementDefinition"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_candidateUuid_fkey" FOREIGN KEY ("candidateUuid") REFERENCES "UserPersonalDate"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "RequirementTemplate"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationAsSubmitted" ADD CONSTRAINT "ApplicationAsSubmitted_applicationUuid_fkey" FOREIGN KEY ("applicationUuid") REFERENCES "Application"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationAsSubmitted" ADD CONSTRAINT "ApplicationAsSubmitted_hufiecCodeAtSubmit_fkey" FOREIGN KEY ("hufiecCodeAtSubmit") REFERENCES "ScoutUnit"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationAsSubmitted" ADD CONSTRAINT "ApplicationAsSubmitted_druzynaCodeAtSubmit_fkey" FOREIGN KEY ("druzynaCodeAtSubmit") REFERENCES "ScoutUnit"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationAsSubmitted" ADD CONSTRAINT "ApplicationAsSubmitted_scoutUnitUuid_fkey" FOREIGN KEY ("scoutUnitUuid") REFERENCES "ScoutUnit"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationRequirement" ADD CONSTRAINT "ApplicationRequirement_applicationUuid_fkey" FOREIGN KEY ("applicationUuid") REFERENCES "Application"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationRequirement" ADD CONSTRAINT "ApplicationRequirement_requirementDefinitionUuid_fkey" FOREIGN KEY ("requirementDefinitionUuid") REFERENCES "RequirementDefinition"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_applicationRequirementUuid_fkey" FOREIGN KEY ("applicationRequirementUuid") REFERENCES "ApplicationRequirement"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationComment" ADD CONSTRAINT "ApplicationComment_applicationUuid_fkey" FOREIGN KEY ("applicationUuid") REFERENCES "Application"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationComment" ADD CONSTRAINT "ApplicationComment_relatedRequirementUuid_fkey" FOREIGN KEY ("relatedRequirementUuid") REFERENCES "ApplicationRequirement"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
