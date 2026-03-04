-- CreateTable
CREATE TABLE "AuditEvent" (
    "uuid" UUID NOT NULL,
    "actorKeycloakUuid" UUID NOT NULL,
    "action" VARCHAR(64) NOT NULL,
    "targetType" VARCHAR(64) NOT NULL,
    "targetUuid" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("uuid")
);

-- CreateIndex
CREATE INDEX "AuditEvent_actorKeycloakUuid_createdAt_idx" ON "AuditEvent"("actorKeycloakUuid", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AuditEvent_action_createdAt_idx" ON "AuditEvent"("action", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AuditEvent_targetType_targetUuid_createdAt_idx" ON "AuditEvent"("targetType", "targetUuid", "createdAt" DESC);

-- CreateFunction
CREATE OR REPLACE FUNCTION "enforce_instructor_application_active_degree_unique"()
RETURNS TRIGGER AS $$
DECLARE
    next_degree_code TEXT;
    conflicting_uuid UUID;
BEGIN
    IF NEW."status" IN ('REJECTED', 'ARCHIVED') THEN
        RETURN NEW;
    END IF;

    SELECT "degreeCode"
      INTO next_degree_code
      FROM "RequirementTemplate"
     WHERE "uuid" = NEW."templateUuid";

    IF next_degree_code IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT ia."uuid"
      INTO conflicting_uuid
      FROM "InstructorApplication" ia
      JOIN "RequirementTemplate" rt ON rt."uuid" = ia."templateUuid"
     WHERE ia."candidateUuid" = NEW."candidateUuid"
       AND ia."status" NOT IN ('REJECTED', 'ARCHIVED')
       AND rt."degreeCode" = next_degree_code
       AND ia."uuid" <> NEW."uuid"
     LIMIT 1;

    IF conflicting_uuid IS NOT NULL THEN
        RAISE EXCEPTION USING
            ERRCODE = '23505',
            CONSTRAINT = 'InstructorApplication_active_degree_unique',
            MESSAGE = format(
                'Active instructor application for degree %s already exists.',
                next_degree_code
            );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- DropTrigger
DROP TRIGGER IF EXISTS "instructor_application_active_degree_unique_guard" ON "InstructorApplication";

-- CreateTrigger
CREATE TRIGGER "instructor_application_active_degree_unique_guard"
BEFORE INSERT OR UPDATE OF "candidateUuid", "templateUuid", "status"
ON "InstructorApplication"
FOR EACH ROW
EXECUTE FUNCTION "enforce_instructor_application_active_degree_unique"();
