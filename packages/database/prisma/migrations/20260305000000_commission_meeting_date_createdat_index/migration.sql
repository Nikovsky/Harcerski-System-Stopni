-- // @file: packages/database/prisma/migrations/20260305000000_commission_meeting_date_createdat_index/migration.sql
CREATE INDEX IF NOT EXISTS "CommissionMeeting_date_createdAt_idx"
  ON "CommissionMeeting" ("date", "createdAt");
