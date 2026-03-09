-- // @file: packages/database/prisma/migrations/20260309173000_restore_meeting_registration_integrity/migration.sql
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM "MeetingRegistration"
     WHERE "status" = 'REGISTERED'
     GROUP BY "meetingUuid", "candidateUuid"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot restore MeetingRegistration active uniqueness: duplicate REGISTERED meeting/candidate rows exist.';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM "MeetingRegistration"
     WHERE "status" = 'REGISTERED'
       AND "slotUuid" IS NOT NULL
     GROUP BY "slotUuid"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot restore MeetingRegistration active slot uniqueness: duplicate REGISTERED slot rows exist.';
  END IF;
END
$$;

-- Support meeting-level active registration checks with a composite index.
CREATE INDEX IF NOT EXISTS "MeetingRegistration_meetingUuid_candidateUuid_status_idx"
  ON "MeetingRegistration" ("meetingUuid", "candidateUuid", "status");

-- Enforce one active registration per slot in SLOTS mode.
CREATE UNIQUE INDEX IF NOT EXISTS "MeetingRegistration_active_slot_unique"
  ON "MeetingRegistration" ("slotUuid")
  WHERE "status" = 'REGISTERED' AND "slotUuid" IS NOT NULL;

-- Enforce one active registration per user per meeting (covers DAY_ONLY and SLOTS).
CREATE UNIQUE INDEX IF NOT EXISTS "MeetingRegistration_active_meeting_candidate_unique"
  ON "MeetingRegistration" ("meetingUuid", "candidateUuid")
  WHERE "status" = 'REGISTERED';
