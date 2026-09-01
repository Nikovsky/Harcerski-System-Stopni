/*
  Warnings:

  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `email` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `firstName` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `secondName` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `surname` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `uuid` on the `User` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "ApplicationComment" DROP CONSTRAINT "ApplicationComment_authorUuid_fkey";

-- DropForeignKey
ALTER TABLE "CommissionDocument" DROP CONSTRAINT "CommissionDocument_uploadedByUuid_fkey";

-- DropForeignKey
ALTER TABLE "CommissionMeeting" DROP CONSTRAINT "CommissionMeeting_createdByUuid_fkey";

-- DropForeignKey
ALTER TABLE "CommissionMember" DROP CONSTRAINT "CommissionMember_userUuid_fkey";

-- DropForeignKey
ALTER TABLE "InstructorApplication" DROP CONSTRAINT "InstructorApplication_candidateUuid_fkey";

-- DropForeignKey
ALTER TABLE "InstructorApplicationFixRequest" DROP CONSTRAINT "InstructorApplicationFixRequest_createdByUuid_fkey";

-- DropForeignKey
ALTER TABLE "InstructorApplicationFixRequest" DROP CONSTRAINT "InstructorApplicationFixRequest_publishedByUuid_fkey";

-- DropForeignKey
ALTER TABLE "InstructorApplicationFixRequest" DROP CONSTRAINT "InstructorApplicationFixRequest_resolvedByUuid_fkey";

-- DropForeignKey
ALTER TABLE "InstructorApplicationFixRequest" DROP CONSTRAINT "InstructorApplicationFixRequest_updatedByUuid_fkey";

-- DropForeignKey
ALTER TABLE "InstructorReviewCandidateAnnotation" DROP CONSTRAINT "InstructorReviewCandidateAnnotation_createdByUuid_fkey";

-- DropForeignKey
ALTER TABLE "InstructorReviewCandidateAnnotation" DROP CONSTRAINT "InstructorReviewCandidateAnnotation_publishedByUuid_fkey";

-- DropForeignKey
ALTER TABLE "InstructorReviewCandidateAnnotation" DROP CONSTRAINT "InstructorReviewCandidateAnnotation_resolvedByUuid_fkey";

-- DropForeignKey
ALTER TABLE "InstructorReviewCandidateAnnotation" DROP CONSTRAINT "InstructorReviewCandidateAnnotation_updatedByUuid_fkey";

-- DropForeignKey
ALTER TABLE "InstructorReviewInternalNote" DROP CONSTRAINT "InstructorReviewInternalNote_createdByUuid_fkey";

-- DropForeignKey
ALTER TABLE "InstructorReviewRevisionRequest" DROP CONSTRAINT "InstructorReviewRevisionRequest_createdByUuid_fkey";

-- DropForeignKey
ALTER TABLE "InstructorReviewRevisionRequest" DROP CONSTRAINT "InstructorReviewRevisionRequest_publishedByUuid_fkey";

-- DropForeignKey
ALTER TABLE "InstructorReviewRevisionRequest" DROP CONSTRAINT "InstructorReviewRevisionRequest_resolvedByUuid_fkey";

-- DropForeignKey
ALTER TABLE "InstructorReviewRevisionRequest" DROP CONSTRAINT "InstructorReviewRevisionRequest_updatedByUuid_fkey";

-- DropForeignKey
ALTER TABLE "MeetingRegistration" DROP CONSTRAINT "MeetingRegistration_candidateUuid_fkey";

-- DropForeignKey
ALTER TABLE "ScoutApplication" DROP CONSTRAINT "ScoutApplication_candidateUuid_fkey";

-- Repoint every domain relation from the legacy local UUID to the Keycloak UUID.
-- This must happen before User.uuid is removed.
UPDATE "ApplicationComment" AS child
SET "authorUuid" = parent."keycloakUuid"
FROM "User" AS parent
WHERE child."authorUuid" = parent."uuid";

UPDATE "CommissionDocument" AS child
SET "uploadedByUuid" = parent."keycloakUuid"
FROM "User" AS parent
WHERE child."uploadedByUuid" = parent."uuid";

UPDATE "CommissionMeeting" AS child
SET "createdByUuid" = parent."keycloakUuid"
FROM "User" AS parent
WHERE child."createdByUuid" = parent."uuid";

UPDATE "CommissionMember" AS child
SET "userUuid" = parent."keycloakUuid"
FROM "User" AS parent
WHERE child."userUuid" = parent."uuid";

UPDATE "InstructorApplication" AS child
SET "candidateUuid" = parent."keycloakUuid"
FROM "User" AS parent
WHERE child."candidateUuid" = parent."uuid";

UPDATE "InstructorApplicationFixRequest" AS child
SET "createdByUuid" = parent."keycloakUuid"
FROM "User" AS parent
WHERE child."createdByUuid" = parent."uuid";

UPDATE "InstructorApplicationFixRequest" AS child
SET "updatedByUuid" = parent."keycloakUuid"
FROM "User" AS parent
WHERE child."updatedByUuid" = parent."uuid";

UPDATE "InstructorApplicationFixRequest" AS child
SET "publishedByUuid" = parent."keycloakUuid"
FROM "User" AS parent
WHERE child."publishedByUuid" = parent."uuid";

UPDATE "InstructorApplicationFixRequest" AS child
SET "resolvedByUuid" = parent."keycloakUuid"
FROM "User" AS parent
WHERE child."resolvedByUuid" = parent."uuid";

UPDATE "InstructorReviewCandidateAnnotation" AS child
SET "createdByUuid" = parent."keycloakUuid"
FROM "User" AS parent
WHERE child."createdByUuid" = parent."uuid";

UPDATE "InstructorReviewCandidateAnnotation" AS child
SET "updatedByUuid" = parent."keycloakUuid"
FROM "User" AS parent
WHERE child."updatedByUuid" = parent."uuid";

UPDATE "InstructorReviewCandidateAnnotation" AS child
SET "publishedByUuid" = parent."keycloakUuid"
FROM "User" AS parent
WHERE child."publishedByUuid" = parent."uuid";

UPDATE "InstructorReviewCandidateAnnotation" AS child
SET "resolvedByUuid" = parent."keycloakUuid"
FROM "User" AS parent
WHERE child."resolvedByUuid" = parent."uuid";

UPDATE "InstructorReviewInternalNote" AS child
SET "createdByUuid" = parent."keycloakUuid"
FROM "User" AS parent
WHERE child."createdByUuid" = parent."uuid";

UPDATE "InstructorReviewRevisionRequest" AS child
SET "createdByUuid" = parent."keycloakUuid"
FROM "User" AS parent
WHERE child."createdByUuid" = parent."uuid";

UPDATE "InstructorReviewRevisionRequest" AS child
SET "updatedByUuid" = parent."keycloakUuid"
FROM "User" AS parent
WHERE child."updatedByUuid" = parent."uuid";

UPDATE "InstructorReviewRevisionRequest" AS child
SET "publishedByUuid" = parent."keycloakUuid"
FROM "User" AS parent
WHERE child."publishedByUuid" = parent."uuid";

UPDATE "InstructorReviewRevisionRequest" AS child
SET "resolvedByUuid" = parent."keycloakUuid"
FROM "User" AS parent
WHERE child."resolvedByUuid" = parent."uuid";

UPDATE "MeetingRegistration" AS child
SET "candidateUuid" = parent."keycloakUuid"
FROM "User" AS parent
WHERE child."candidateUuid" = parent."uuid";

UPDATE "ScoutApplication" AS child
SET "candidateUuid" = parent."keycloakUuid"
FROM "User" AS parent
WHERE child."candidateUuid" = parent."uuid";

-- DropIndex
DROP INDEX "User_email_idx";

-- DropIndex
DROP INDEX "User_email_key";

-- DropIndex
DROP INDEX "User_keycloakUuid_idx";

-- DropIndex
DROP INDEX "User_keycloakUuid_key";

-- AlterTable
ALTER TABLE "InstructorApplicationFixRequest" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "InstructorReviewInternalNote" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
DROP COLUMN "email",
DROP COLUMN "firstName",
DROP COLUMN "role",
DROP COLUMN "secondName",
DROP COLUMN "surname",
DROP COLUMN "uuid",
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("keycloakUuid");

-- CreateTable
CREATE TABLE "AuthUser" (
    "id" TEXT NOT NULL,
    "keycloakUuid" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "givenName" TEXT,
    "familyName" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "AuthUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthAccount" (
    "id" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMPTZ,
    "refreshTokenExpiresAt" TIMESTAMPTZ,
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "AuthAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthVerification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "AuthVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthUser_keycloakUuid_key" ON "AuthUser"("keycloakUuid");

-- CreateIndex
CREATE UNIQUE INDEX "AuthUser_email_key" ON "AuthUser"("email");

-- CreateIndex
CREATE INDEX "AuthAccount_userId_idx" ON "AuthAccount"("userId");

-- CreateIndex
CREATE INDEX "AuthAccount_providerId_accountId_idx" ON "AuthAccount"("providerId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthAccount_issuer_accountId_key" ON "AuthAccount"("issuer", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_token_key" ON "AuthSession"("token");

-- CreateIndex
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");

-- CreateIndex
CREATE INDEX "AuthVerification_identifier_idx" ON "AuthVerification"("identifier");

-- AddForeignKey
ALTER TABLE "AuthUser" ADD CONSTRAINT "AuthUser_keycloakUuid_fkey" FOREIGN KEY ("keycloakUuid") REFERENCES "User"("keycloakUuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthAccount" ADD CONSTRAINT "AuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AuthUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AuthUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionMember" ADD CONSTRAINT "CommissionMember_userUuid_fkey" FOREIGN KEY ("userUuid") REFERENCES "User"("keycloakUuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorApplication" ADD CONSTRAINT "InstructorApplication_candidateUuid_fkey" FOREIGN KEY ("candidateUuid") REFERENCES "User"("keycloakUuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoutApplication" ADD CONSTRAINT "ScoutApplication_candidateUuid_fkey" FOREIGN KEY ("candidateUuid") REFERENCES "User"("keycloakUuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationComment" ADD CONSTRAINT "ApplicationComment_authorUuid_fkey" FOREIGN KEY ("authorUuid") REFERENCES "User"("keycloakUuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorApplicationFixRequest" ADD CONSTRAINT "InstructorApplicationFixRequest_createdByUuid_fkey" FOREIGN KEY ("createdByUuid") REFERENCES "User"("keycloakUuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorApplicationFixRequest" ADD CONSTRAINT "InstructorApplicationFixRequest_updatedByUuid_fkey" FOREIGN KEY ("updatedByUuid") REFERENCES "User"("keycloakUuid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorApplicationFixRequest" ADD CONSTRAINT "InstructorApplicationFixRequest_publishedByUuid_fkey" FOREIGN KEY ("publishedByUuid") REFERENCES "User"("keycloakUuid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorApplicationFixRequest" ADD CONSTRAINT "InstructorApplicationFixRequest_resolvedByUuid_fkey" FOREIGN KEY ("resolvedByUuid") REFERENCES "User"("keycloakUuid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorReviewInternalNote" ADD CONSTRAINT "InstructorReviewInternalNote_createdByUuid_fkey" FOREIGN KEY ("createdByUuid") REFERENCES "User"("keycloakUuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorReviewRevisionRequest" ADD CONSTRAINT "InstructorReviewRevisionRequest_createdByUuid_fkey" FOREIGN KEY ("createdByUuid") REFERENCES "User"("keycloakUuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorReviewRevisionRequest" ADD CONSTRAINT "InstructorReviewRevisionRequest_updatedByUuid_fkey" FOREIGN KEY ("updatedByUuid") REFERENCES "User"("keycloakUuid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorReviewRevisionRequest" ADD CONSTRAINT "InstructorReviewRevisionRequest_publishedByUuid_fkey" FOREIGN KEY ("publishedByUuid") REFERENCES "User"("keycloakUuid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorReviewRevisionRequest" ADD CONSTRAINT "InstructorReviewRevisionRequest_resolvedByUuid_fkey" FOREIGN KEY ("resolvedByUuid") REFERENCES "User"("keycloakUuid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorReviewCandidateAnnotation" ADD CONSTRAINT "InstructorReviewCandidateAnnotation_createdByUuid_fkey" FOREIGN KEY ("createdByUuid") REFERENCES "User"("keycloakUuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorReviewCandidateAnnotation" ADD CONSTRAINT "InstructorReviewCandidateAnnotation_updatedByUuid_fkey" FOREIGN KEY ("updatedByUuid") REFERENCES "User"("keycloakUuid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorReviewCandidateAnnotation" ADD CONSTRAINT "InstructorReviewCandidateAnnotation_publishedByUuid_fkey" FOREIGN KEY ("publishedByUuid") REFERENCES "User"("keycloakUuid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorReviewCandidateAnnotation" ADD CONSTRAINT "InstructorReviewCandidateAnnotation_resolvedByUuid_fkey" FOREIGN KEY ("resolvedByUuid") REFERENCES "User"("keycloakUuid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionMeeting" ADD CONSTRAINT "CommissionMeeting_createdByUuid_fkey" FOREIGN KEY ("createdByUuid") REFERENCES "User"("keycloakUuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingRegistration" ADD CONSTRAINT "MeetingRegistration_candidateUuid_fkey" FOREIGN KEY ("candidateUuid") REFERENCES "User"("keycloakUuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionDocument" ADD CONSTRAINT "CommissionDocument_uploadedByUuid_fkey" FOREIGN KEY ("uploadedByUuid") REFERENCES "User"("keycloakUuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "InstructorApplicationFixRequest_applicationUuid_status_updatedA" RENAME TO "InstructorApplicationFixRequest_applicationUuid_status_upda_idx";

-- RenameIndex
ALTER INDEX "InstructorReviewCandidateAnnotation_publishedByUuid_publishedAt" RENAME TO "InstructorReviewCandidateAnnotation_publishedByUuid_publish_idx";

-- RenameIndex
ALTER INDEX "InstructorReviewCandidateAnnotation_resolvedByUuid_resolvedAt_i" RENAME TO "InstructorReviewCandidateAnnotation_resolvedByUuid_resolved_idx";

-- RenameIndex
ALTER INDEX "InstructorReviewCandidateAnnotation_revisionRequestUuid_anchor_" RENAME TO "InstructorReviewCandidateAnnotation_revisionRequestUuid_anc_idx";

-- RenameIndex
ALTER INDEX "InstructorReviewCandidateAnnotation_revisionRequestUuid_status_" RENAME TO "InstructorReviewCandidateAnnotation_revisionRequestUuid_sta_idx";

-- RenameIndex
ALTER INDEX "InstructorReviewInternalNote_applicationUuid_anchor_idx" RENAME TO "InstructorReviewInternalNote_applicationUuid_anchorType_anc_idx";

-- RenameIndex
ALTER INDEX "InstructorReviewRevisionRequest_applicationUuid_status_updatedA" RENAME TO "InstructorReviewRevisionRequest_applicationUuid_status_upda_idx";
