-- AlterEnum
ALTER TYPE "LeadType" ADD VALUE 'FINAL_EXPENSE';
ALTER TYPE "LeadType" ADD VALUE 'IUL';

-- AlterTable
ALTER TABLE "leads" ALTER COLUMN "dateOfBirth" DROP NOT NULL;
ALTER TABLE "leads" ADD COLUMN     "email" TEXT,
ADD COLUMN     "address" TEXT,
ADD COLUMN     "zip" TEXT,
ADD COLUMN     "county" TEXT,
ADD COLUMN     "beneficiary" TEXT,
ADD COLUMN     "beneficiaryRelationship" TEXT,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "maritalStatus" TEXT,
ADD COLUMN     "height" TEXT,
ADD COLUMN     "weight" TEXT,
ADD COLUMN     "tobaccoUse" BOOLEAN,
ADD COLUMN     "occupation" TEXT,
ADD COLUMN     "income" TEXT,
ADD COLUMN     "existingCoverage" TEXT,
ADD COLUMN     "coverageAmountRequested" TEXT,
ADD COLUMN     "militaryBranch" TEXT,
ADD COLUMN     "vendorNotes" TEXT;
