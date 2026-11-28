-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "healthConditions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "tobaccoStatus" TEXT;

-- AlterTable
ALTER TABLE "policies" ADD COLUMN     "beneficiaryName" TEXT,
ADD COLUMN     "beneficiaryRelationship" TEXT,
ADD COLUMN     "effectiveDate" TIMESTAMP(3),
ADD COLUMN     "monthlyPremium" DECIMAL(10,2),
ADD COLUMN     "policyNumber" TEXT;
