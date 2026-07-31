-- CreateTable
CREATE TABLE "contact_log_entries" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "agentId" TEXT,
    "status" "LeadStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_log_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contact_log_entries_leadId_createdAt_idx" ON "contact_log_entries"("leadId", "createdAt");

-- AddForeignKey
ALTER TABLE "contact_log_entries" ADD CONSTRAINT "contact_log_entries_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_log_entries" ADD CONSTRAINT "contact_log_entries_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
