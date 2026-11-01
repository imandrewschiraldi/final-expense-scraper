-- CreateEnum
CREATE TYPE "AnnouncementType" AS ENUM ('VIDEO', 'IMAGE');

-- AlterTable
ALTER TABLE "agency_settings" ADD COLUMN     "hallOfFameTargetAP" DECIMAL(12,2) NOT NULL DEFAULT 400000;

-- CreateTable
CREATE TABLE "announcement_items" (
    "id" TEXT NOT NULL,
    "type" "AnnouncementType" NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcement_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "announcement_items_active_order_idx" ON "announcement_items"("active", "order");

-- AddForeignKey
ALTER TABLE "announcement_items" ADD CONSTRAINT "announcement_items_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
