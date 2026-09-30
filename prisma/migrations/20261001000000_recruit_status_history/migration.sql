-- CreateTable
CREATE TABLE "recruit_status_history" (
    "id" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "fromStatus" "RecruitStatus",
    "toStatus" "RecruitStatus" NOT NULL,
    "changedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recruit_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recruit_status_history_toStatus_createdAt_idx" ON "recruit_status_history"("toStatus", "createdAt");

-- CreateIndex
CREATE INDEX "recruit_status_history_prospectId_createdAt_idx" ON "recruit_status_history"("prospectId", "createdAt");

-- AddForeignKey
ALTER TABLE "recruit_status_history" ADD CONSTRAINT "recruit_status_history_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "recruit_prospects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruit_status_history" ADD CONSTRAINT "recruit_status_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
