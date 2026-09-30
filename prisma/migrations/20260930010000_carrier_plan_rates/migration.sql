-- CreateTable
CREATE TABLE "carrier_plan_rates" (
    "id" TEXT NOT NULL,
    "carrierPlanId" TEXT NOT NULL,
    "compLevel" INTEGER NOT NULL,
    "payoutPercent" DECIMAL(5,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carrier_plan_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "carrier_plan_rates_carrierPlanId_compLevel_key" ON "carrier_plan_rates"("carrierPlanId", "compLevel");

-- AddForeignKey
ALTER TABLE "carrier_plan_rates" ADD CONSTRAINT "carrier_plan_rates_carrierPlanId_fkey" FOREIGN KEY ("carrierPlanId") REFERENCES "carrier_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
