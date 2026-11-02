-- CreateEnum
CREATE TYPE "OverviewSubtitleColor" AS ENUM ('WHITE', 'GRAY', 'COPPER');

-- AlterTable
ALTER TABLE "agency_settings" ADD COLUMN     "overviewSubtitleText" TEXT NOT NULL DEFAULT 'Here''s what''s new across the agency since you last logged in.',
ADD COLUMN     "overviewSubtitleColor" "OverviewSubtitleColor" NOT NULL DEFAULT 'GRAY',
ADD COLUMN     "overviewSubtitleBold" BOOLEAN NOT NULL DEFAULT false;
