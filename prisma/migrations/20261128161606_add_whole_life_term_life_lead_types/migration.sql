-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LeadType" ADD VALUE 'WHOLE_LIFE';
ALTER TYPE "LeadType" ADD VALUE 'TERM_LIFE';
