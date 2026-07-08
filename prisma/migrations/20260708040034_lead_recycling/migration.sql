-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "wasRecycled" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "leads_wasRecycled_idx" ON "leads"("wasRecycled");
