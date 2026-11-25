-- AlterTable
ALTER TABLE "agency_settings" ADD COLUMN "pageLayoutBetaEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "cardLayoutEnabled";
