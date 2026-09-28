-- AlterTable
ALTER TABLE "carriers" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- Backfill: preserve today's alphabetical order as the starting order for
-- any carriers that already exist, so nothing visually reshuffles until an
-- admin explicitly reorders them.
UPDATE "carriers" c
SET "order" = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY name ASC) - 1 AS rn
  FROM "carriers"
) sub
WHERE c.id = sub.id;
