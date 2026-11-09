-- CreateTable
CREATE TABLE "training_chapters" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_chapters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "training_chapters_moduleId_order_idx" ON "training_chapters"("moduleId", "order");

-- AddForeignKey
ALTER TABLE "training_chapters" ADD CONSTRAINT "training_chapters_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "training_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: one chapter per existing module, to hold its current lessons —
-- every module that had lessons directly on it before now has a single
-- "Chapter 1" so nothing an agent was partway through moves or disappears.
INSERT INTO "training_chapters" ("id", "moduleId", "title", "order", "createdAt", "updatedAt")
SELECT
    md5(random()::text || clock_timestamp()::text || "id"),
    "id",
    'Chapter 1',
    0,
    now(),
    now()
FROM "training_modules";

-- AlterTable: add chapterId nullable first so it can be backfilled, then
-- enforced not-null once every row has one.
ALTER TABLE "training_lessons" ADD COLUMN "chapterId" TEXT;

UPDATE "training_lessons" l
SET "chapterId" = c."id"
FROM "training_chapters" c
WHERE c."moduleId" = l."moduleId";

ALTER TABLE "training_lessons" ALTER COLUMN "chapterId" SET NOT NULL;

-- DropForeignKey
ALTER TABLE "training_lessons" DROP CONSTRAINT "training_lessons_moduleId_fkey";

-- DropIndex
DROP INDEX "training_lessons_moduleId_order_idx";

-- AlterTable
ALTER TABLE "training_lessons" DROP COLUMN "moduleId";

-- AddForeignKey
ALTER TABLE "training_lessons" ADD CONSTRAINT "training_lessons_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "training_chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "training_lessons_chapterId_order_idx" ON "training_lessons"("chapterId", "order");
