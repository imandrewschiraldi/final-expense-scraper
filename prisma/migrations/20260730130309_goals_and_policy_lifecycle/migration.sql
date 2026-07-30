-- CreateEnum
CREATE TYPE "GoalCategory" AS ENUM ('MONTHLY_AP', 'ANNUAL_AP', 'ISSUED_PREMIUM', 'POLICY_COUNT', 'INCOME', 'RECRUITING');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'GOAL_ACHIEVED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PolicyStatus" ADD VALUE 'PENDING';
ALTER TYPE "PolicyStatus" ADD VALUE 'PLACED';
ALTER TYPE "PolicyStatus" ADD VALUE 'CANCELED';
ALTER TYPE "PolicyStatus" ADD VALUE 'LAPSED';
ALTER TYPE "PolicyStatus" ADD VALUE 'DECLINED';
ALTER TYPE "PolicyStatus" ADD VALUE 'CHARGEBACK';

-- CreateTable
CREATE TABLE "policy_status_history" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "fromStatus" "PolicyStatus",
    "toStatus" "PolicyStatus" NOT NULL,
    "changedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policy_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "GoalCategory" NOT NULL,
    "targetValue" DECIMAL(12,2) NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "achievedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "policy_status_history_policyId_createdAt_idx" ON "policy_status_history"("policyId", "createdAt");

-- CreateIndex
CREATE INDEX "goals_userId_periodEnd_idx" ON "goals"("userId", "periodEnd");

-- AddForeignKey
ALTER TABLE "policy_status_history" ADD CONSTRAINT "policy_status_history_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_status_history" ADD CONSTRAINT "policy_status_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
