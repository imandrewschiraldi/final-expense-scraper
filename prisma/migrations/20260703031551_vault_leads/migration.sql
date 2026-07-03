-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "isVaulted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "vaultOrigin" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "leads_isVaulted_idx" ON "leads"("isVaulted");

-- CreateIndex
CREATE INDEX "leads_vaultOrigin_status_idx" ON "leads"("vaultOrigin", "status");
