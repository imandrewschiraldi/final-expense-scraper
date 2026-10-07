-- AlterTable
ALTER TABLE "training_lessons" ALTER COLUMN "videoUrl" DROP NOT NULL;

-- CreateTable
CREATE TABLE "training_lesson_images" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_lesson_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "training_lesson_images_lessonId_order_idx" ON "training_lesson_images"("lessonId", "order");

-- AddForeignKey
ALTER TABLE "training_lesson_images" ADD CONSTRAINT "training_lesson_images_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "training_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
