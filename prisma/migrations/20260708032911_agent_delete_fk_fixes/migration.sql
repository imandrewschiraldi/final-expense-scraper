-- DropForeignKey
ALTER TABLE "assignment_run_flags" DROP CONSTRAINT "assignment_run_flags_agentId_fkey";

-- DropForeignKey
ALTER TABLE "lead_notes" DROP CONSTRAINT "lead_notes_authorId_fkey";

-- AlterTable
ALTER TABLE "lead_notes" ALTER COLUMN "authorId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "lead_notes" ADD CONSTRAINT "lead_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_run_flags" ADD CONSTRAINT "assignment_run_flags_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
