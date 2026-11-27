-- AlterTable
ALTER TABLE "users" ADD COLUMN     "f90CompletedSteps" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "f90EnrolledAt" TIMESTAMP(3);
