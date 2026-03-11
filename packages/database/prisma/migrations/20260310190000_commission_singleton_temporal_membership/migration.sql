-- @file: packages/database/prisma/migrations/20260310190000_commission_singleton_temporal_membership/migration.sql
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Commission"
    WHERE "type" IS NULL
  ) THEN
    RAISE EXCEPTION
      'Cannot enforce singleton commissions because some Commission rows have NULL type.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      SELECT "type"
      FROM "Commission"
      GROUP BY "type"
      HAVING COUNT(*) > 1
    ) AS duplicate_commission_types
  ) THEN
    RAISE EXCEPTION
      'Cannot enforce singleton commissions because duplicate Commission.type rows already exist.';
  END IF;
END
$$;

DROP INDEX IF EXISTS "Commission_type_status_idx";
DROP INDEX IF EXISTS "CommissionMember_commissionUuid_userUuid_key";
DROP INDEX IF EXISTS "CommissionMember_userUuid_idx";
DROP INDEX IF EXISTS "CommissionMember_commissionUuid_idx";

ALTER TABLE "Commission"
ALTER COLUMN "type" SET NOT NULL;

CREATE UNIQUE INDEX "Commission_type_key"
ON "Commission"("type");

CREATE INDEX "Commission_status_idx"
ON "Commission"("status");

ALTER TABLE "CommissionMember"
ADD CONSTRAINT "CommissionMember_leftAt_after_joinedAt_chk"
CHECK ("leftAt" IS NULL OR "leftAt" >= "joinedAt");

ALTER TABLE "CommissionMember"
ADD CONSTRAINT "CommissionMember_active_requires_open_period_chk"
CHECK (NOT ("status" = 'ACTIVE' AND "leftAt" IS NOT NULL));

CREATE INDEX "CommissionMember_commissionUuid_status_leftAt_idx"
ON "CommissionMember"("commissionUuid", "status", "leftAt");

CREATE INDEX "CommissionMember_userUuid_status_leftAt_idx"
ON "CommissionMember"("userUuid", "status", "leftAt");

CREATE INDEX "CommissionMember_commissionUuid_userUuid_joinedAt_idx"
ON "CommissionMember"("commissionUuid", "userUuid", "joinedAt" DESC);

CREATE UNIQUE INDEX "CommissionMember_single_active_membership_idx"
ON "CommissionMember"("commissionUuid", "userUuid")
WHERE "status" = 'ACTIVE' AND "leftAt" IS NULL;
