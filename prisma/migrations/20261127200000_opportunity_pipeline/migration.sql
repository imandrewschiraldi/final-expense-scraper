-- AlterEnum
ALTER TYPE "LeadType" ADD VALUE 'ANNUITY';

-- CreateEnum
CREATE TYPE "PipelinePhase" AS ENUM ('LEAD', 'CLIENT');

-- CreateTable
CREATE TABLE "pipeline_stages" (
    "id" TEXT NOT NULL,
    "phase" "PipelinePhase" NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "colorToken" TEXT NOT NULL DEFAULT 'gray',
    "systemKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pipeline_stages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pipeline_stages_phase_systemKey_key" ON "pipeline_stages"("phase", "systemKey");

-- CreateIndex
CREATE INDEX "pipeline_stages_phase_order_idx" ON "pipeline_stages"("phase", "order");

-- AlterTable
ALTER TABLE "leads" ADD COLUMN "pipelineStageId" TEXT;

-- CreateIndex
CREATE INDEX "leads_pipelineStageId_idx" ON "leads"("pipelineStageId");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_pipelineStageId_fkey" FOREIGN KEY ("pipelineStageId") REFERENCES "pipeline_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "policies"
    ADD COLUMN "leadType" "LeadType",
    ADD COLUMN "pipelineStageId" TEXT,
    ADD COLUMN "notes" TEXT,
    ADD COLUMN "followUpAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "policies_pipelineStageId_idx" ON "policies"("pipelineStageId");

-- CreateIndex
CREATE INDEX "policies_followUpAt_idx" ON "policies"("followUpAt");

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_pipelineStageId_fkey" FOREIGN KEY ("pipelineStageId") REFERENCES "pipeline_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
