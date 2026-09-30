-- AlterTable
ALTER TABLE "job_applications" ADD COLUMN     "base44Id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "job_applications_base44Id_key" ON "job_applications"("base44Id");
