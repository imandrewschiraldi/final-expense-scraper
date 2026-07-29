-- AlterTable
ALTER TABLE "users" ADD COLUMN     "assignmentEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "compLevel" TEXT,
ADD COLUMN     "profileImageUrl" TEXT,
ADD COLUMN     "vaultEnabled" BOOLEAN NOT NULL DEFAULT true;
