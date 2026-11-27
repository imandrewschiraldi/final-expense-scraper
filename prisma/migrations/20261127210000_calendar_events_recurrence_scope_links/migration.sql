/*
  Warnings:

  - You are about to drop the column `recurring` on the `calendar_events` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "RecurrenceRule" AS ENUM ('DAILY', 'WEEKDAYS', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "CalendarEventScope" AS ENUM ('AGENCY', 'PERSONAL');

-- AlterTable
ALTER TABLE "calendar_events"
ADD COLUMN     "allDay" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "color" TEXT NOT NULL DEFAULT 'copper',
ADD COLUMN     "leadId" TEXT,
ADD COLUMN     "ownerId" TEXT,
ADD COLUMN     "policyId" TEXT,
ADD COLUMN     "recurrenceRule" "RecurrenceRule",
ADD COLUMN     "scope" "CalendarEventScope" NOT NULL DEFAULT 'AGENCY';

-- Every existing event's `recurring` flag only ever meant "repeats
-- weekly" (the only pattern this feature supported until now) — carry
-- that meaning forward into the new column before dropping the old one,
-- so an admin's existing weekly trainings don't silently stop repeating.
UPDATE "calendar_events" SET "recurrenceRule" = 'WEEKLY' WHERE "recurring" = true;

ALTER TABLE "calendar_events" DROP COLUMN "recurring";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "timeZone" TEXT;

-- CreateIndex
CREATE INDEX "calendar_events_ownerId_idx" ON "calendar_events"("ownerId");

-- CreateIndex
CREATE INDEX "calendar_events_leadId_idx" ON "calendar_events"("leadId");

-- CreateIndex
CREATE INDEX "calendar_events_policyId_idx" ON "calendar_events"("policyId");

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
