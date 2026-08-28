-- CreateTable
CREATE TABLE "carriers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carriers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carrier_plans" (
    "id" TEXT NOT NULL,
    "carrierId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "payoutMultiplier" DECIMAL(5,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carrier_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "carriers_name_key" ON "carriers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "carrier_plans_carrierId_name_key" ON "carrier_plans"("carrierId", "name");

-- AddForeignKey
ALTER TABLE "carrier_plans" ADD CONSTRAINT "carrier_plans_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "carriers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "policies" ADD COLUMN "carrierPlanId" TEXT,
ADD COLUMN "commissionAmount" DECIMAL(12,2);

-- CreateIndex
CREATE INDEX "policies_carrierPlanId_idx" ON "policies"("carrierPlanId");

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_carrierPlanId_fkey" FOREIGN KEY ("carrierPlanId") REFERENCES "carrier_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
