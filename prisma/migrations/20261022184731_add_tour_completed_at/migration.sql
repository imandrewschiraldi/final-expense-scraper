-- AlterTable
ALTER TABLE "users" ADD COLUMN     "tourCompletedAt" TIMESTAMP(3);

-- Backfill: every account that already exists is treated as already past
-- onboarding, so only a user created after this migration (tourCompletedAt
-- stays null) gets the tour auto-started on their first login.
UPDATE "users" SET "tourCompletedAt" = NOW() WHERE "tourCompletedAt" IS NULL;
