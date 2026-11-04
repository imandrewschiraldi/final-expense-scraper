-- CreateTable
CREATE TABLE "training_lesson_videos" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_lesson_videos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "training_lesson_videos_lessonId_order_idx" ON "training_lesson_videos"("lessonId", "order");

-- AddForeignKey
ALTER TABLE "training_lesson_videos" ADD CONSTRAINT "training_lesson_videos_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "training_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A lesson used to hold at most one video; carry every existing one over
-- as that lesson's first video row rather than silently dropping it when
-- the old column goes away below. md5(random()||clock_timestamp()||id)
-- stands in for cuid() here (no pgcrypto/uuid extension assumed) — good
-- enough for a one-time backfill this small, never used at runtime.
INSERT INTO "training_lesson_videos" ("id", "lessonId", "url", "order", "createdAt")
SELECT md5(random()::text || clock_timestamp()::text || "id"), "id", "videoUrl", 0, "createdAt"
FROM "training_lessons"
WHERE "videoUrl" IS NOT NULL;

-- AlterTable
ALTER TABLE "training_lessons" DROP COLUMN "videoUrl";
