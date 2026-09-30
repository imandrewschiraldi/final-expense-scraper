-- CreateEnum
CREATE TYPE "RecruitStatus" AS ENUM ('NEW', 'DMD', 'REPLIED', 'HIRED', 'PASS');

-- CreateTable
CREATE TABLE "recruit_prospects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "linkedinUrl" TEXT,
    "yearsExp" TEXT,
    "status" "RecruitStatus" NOT NULL DEFAULT 'NEW',
    "category" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recruit_prospects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recruit_prospects_dedupeKey_key" ON "recruit_prospects"("dedupeKey");

-- CreateIndex
CREATE INDEX "recruit_prospects_status_idx" ON "recruit_prospects"("status");
