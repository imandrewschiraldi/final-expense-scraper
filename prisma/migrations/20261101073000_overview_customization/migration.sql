-- AlterEnum
ALTER TYPE "AnnouncementType" ADD VALUE 'UPLOADED_VIDEO';
ALTER TYPE "AnnouncementType" ADD VALUE 'PDF';

-- AlterTable
ALTER TABLE "announcement_items" ADD COLUMN     "thumbnailUrl" TEXT;

-- CreateTable
CREATE TABLE "overview_widgets" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "overview_widgets_pkey" PRIMARY KEY ("id")
);
