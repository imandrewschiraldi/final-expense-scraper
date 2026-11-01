-- CreateEnum
CREATE TYPE "PolicyLine" AS ENUM ('LIFE', 'ANNUITY');

-- AlterTable
ALTER TABLE "policies" ADD COLUMN     "line" "PolicyLine" NOT NULL DEFAULT 'LIFE';

-- AlterTable
ALTER TABLE "agency_settings" ADD COLUMN     "hallOfFameAgencyTargetAP" DECIMAL(12,2) NOT NULL DEFAULT 10000000,
ADD COLUMN     "hallOfFameAnnuityTargetAP" DECIMAL(12,2) NOT NULL DEFAULT 2000000;
