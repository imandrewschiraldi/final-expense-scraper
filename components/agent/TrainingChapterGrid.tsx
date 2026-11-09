"use client";

import { BookOpen } from "lucide-react";
import { TrainingTile } from "@/components/agent/TrainingTile";

type Lesson = { id: string };
type Chapter = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  lessons: Lesson[];
};

/** A module's own page — every chapter as a small tile, same treatment as
 *  the module grid one level up. Picking one drills into that chapter's
 *  lesson breakdown. */
export function TrainingChapterGrid({
  moduleId,
  chapters,
  completedLessonIds,
}: {
  moduleId: string;
  chapters: Chapter[];
  completedLessonIds: string[];
}) {
  const completedSet = new Set(completedLessonIds);

  if (chapters.length === 0) {
    return (
      <p className="text-sm text-muted">No chapters in this module yet.</p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {chapters.map((chapter, chapterIndex) => {
        const total = chapter.lessons.length;
        const completed = chapter.lessons.filter((l) =>
          completedSet.has(l.id),
        ).length;
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

        return (
          <TrainingTile
            key={chapter.id}
            href={`/agent/training/modules/${moduleId}/chapters/${chapter.id}`}
            eyebrow={`Chapter ${chapterIndex + 1}`}
            title={chapter.title}
            pct={pct}
            coverUrl={chapter.thumbnailUrl}
            fallbackIcon={<BookOpen className="h-8 w-8" strokeWidth={1.25} />}
          />
        );
      })}
    </div>
  );
}
