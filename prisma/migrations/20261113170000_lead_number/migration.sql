-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "leadNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "leads_leadNumber_key" ON "leads"("leadNumber");
