-- // @file: packages/database/prisma/migrations/20260304230000_meeting_registration_uniques/migration.sql
-- Enforce one active registration per slot in SLOTS mode.
CREATE UNIQUE INDEX IF NOT EXISTS "MeetingRegistration_active_slot_unique"
  ON "MeetingRegistration" ("slotUuid")
  WHERE "status" = 'REGISTERED' AND "slotUuid" IS NOT NULL;

-- Enforce one active registration per user per meeting (covers DAY_ONLY and SLOTS).
CREATE UNIQUE INDEX IF NOT EXISTS "MeetingRegistration_active_meeting_candidate_unique"
  ON "MeetingRegistration" ("meetingUuid", "candidateUuid")
  WHERE "status" = 'REGISTERED';
