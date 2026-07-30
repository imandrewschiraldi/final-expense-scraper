-- Narrows PolicyStatus back down to the real 3-state lifecycle
-- (Submitted -> Issued -> Chargeback). Any existing rows using the removed
-- states are remapped to their closest equivalent rather than dropped.
BEGIN;

CREATE TYPE "PolicyStatus_new" AS ENUM ('SUBMITTED', 'ISSUED', 'CHARGEBACK');

ALTER TABLE "policies" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "policies" ALTER COLUMN "status" TYPE "PolicyStatus_new" USING (
  CASE "status"::text
    WHEN 'PENDING' THEN 'SUBMITTED'
    WHEN 'PLACED' THEN 'ISSUED'
    WHEN 'CANCELED' THEN 'CHARGEBACK'
    WHEN 'LAPSED' THEN 'CHARGEBACK'
    WHEN 'DECLINED' THEN 'CHARGEBACK'
    ELSE "status"::text
  END::"PolicyStatus_new"
);
ALTER TABLE "policies" ALTER COLUMN "status" SET DEFAULT 'SUBMITTED';

ALTER TABLE "policy_status_history" ALTER COLUMN "fromStatus" TYPE "PolicyStatus_new" USING (
  CASE "fromStatus"::text
    WHEN 'PENDING' THEN 'SUBMITTED'
    WHEN 'PLACED' THEN 'ISSUED'
    WHEN 'CANCELED' THEN 'CHARGEBACK'
    WHEN 'LAPSED' THEN 'CHARGEBACK'
    WHEN 'DECLINED' THEN 'CHARGEBACK'
    ELSE "fromStatus"::text
  END::"PolicyStatus_new"
);
ALTER TABLE "policy_status_history" ALTER COLUMN "toStatus" TYPE "PolicyStatus_new" USING (
  CASE "toStatus"::text
    WHEN 'PENDING' THEN 'SUBMITTED'
    WHEN 'PLACED' THEN 'ISSUED'
    WHEN 'CANCELED' THEN 'CHARGEBACK'
    WHEN 'LAPSED' THEN 'CHARGEBACK'
    WHEN 'DECLINED' THEN 'CHARGEBACK'
    ELSE "toStatus"::text
  END::"PolicyStatus_new"
);

DROP TYPE "PolicyStatus";
ALTER TYPE "PolicyStatus_new" RENAME TO "PolicyStatus";

COMMIT;
