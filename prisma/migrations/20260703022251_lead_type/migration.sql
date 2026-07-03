-- CreateEnum
CREATE TYPE "LeadType" AS ENUM ('VETERANS_FINAL_EXPENSE', 'MORTGAGE_PROTECTION');

-- AlterTable
ALTER TABLE "imports" ADD COLUMN     "leadType" "LeadType" NOT NULL DEFAULT 'VETERANS_FINAL_EXPENSE';

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "leadType" "LeadType" NOT NULL DEFAULT 'VETERANS_FINAL_EXPENSE';

-- CreateIndex
CREATE INDEX "leads_leadType_idx" ON "leads"("leadType");
