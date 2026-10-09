-- CreateIndex
CREATE INDEX "leads_isVaulted_createdAt_idx" ON "leads"("isVaulted", "createdAt");
