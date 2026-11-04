-- CreateEnum
CREATE TYPE "ShopLeadTier" AS ENUM ('SIX_PLUS', 'NINE_PLUS', 'TWELVE_PLUS');

-- CreateEnum
CREATE TYPE "ShopLeadStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'HELD');

-- CreateEnum
CREATE TYPE "ShopOrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'FULFILLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "shop_buyers" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_buyers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_leads" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "email" TEXT,
    "address" TEXT,
    "zip" TEXT,
    "county" TEXT,
    "gender" TEXT,
    "militaryBranch" TEXT,
    "tier" "ShopLeadTier" NOT NULL,
    "status" "ShopLeadStatus" NOT NULL DEFAULT 'AVAILABLE',
    "reservedOrderId" TEXT,
    "holdUntil" TIMESTAMP(3),
    "timesSold" INTEGER NOT NULL DEFAULT 0,
    "lastSoldAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_orders" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "status" "ShopOrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "tier" "ShopLeadTier" NOT NULL,
    "items" JSONB NOT NULL,
    "leadCount" INTEGER NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "deliverToEmail" TEXT NOT NULL,
    "stripeSessionId" TEXT,
    "paidAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_order_leads" (
    "orderId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,

    CONSTRAINT "shop_order_leads_pkey" PRIMARY KEY ("orderId","leadId")
);

-- CreateIndex
CREATE UNIQUE INDEX "shop_buyers_email_key" ON "shop_buyers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "shop_leads_phone_key" ON "shop_leads"("phone");

-- CreateIndex
CREATE INDEX "shop_leads_status_tier_state_idx" ON "shop_leads"("status", "tier", "state");

-- CreateIndex
CREATE INDEX "shop_leads_status_holdUntil_idx" ON "shop_leads"("status", "holdUntil");

-- CreateIndex
CREATE INDEX "shop_leads_reservedOrderId_idx" ON "shop_leads"("reservedOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "shop_orders_stripeSessionId_key" ON "shop_orders"("stripeSessionId");

-- CreateIndex
CREATE INDEX "shop_orders_buyerId_createdAt_idx" ON "shop_orders"("buyerId", "createdAt");

-- CreateIndex
CREATE INDEX "shop_orders_status_createdAt_idx" ON "shop_orders"("status", "createdAt");

-- CreateIndex
CREATE INDEX "shop_order_leads_leadId_idx" ON "shop_order_leads"("leadId");

-- AddForeignKey
ALTER TABLE "shop_orders" ADD CONSTRAINT "shop_orders_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "shop_buyers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_order_leads" ADD CONSTRAINT "shop_order_leads_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "shop_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_order_leads" ADD CONSTRAINT "shop_order_leads_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "shop_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

