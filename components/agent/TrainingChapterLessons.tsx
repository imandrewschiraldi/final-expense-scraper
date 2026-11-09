"use client";

import { PlayCircle } from "lucide-react";
import { TrainingTile } from "@/components/agent/TrainingTile";

type Lesson = { id: string; title: string; description: string | null };

/** A chapter's own page — its lessons broken down as a grid of tiles, the
 *  last stop before the actual lesson view. A lesson has no partial
 *  state like a module or chapter does, so its tile's progress bar is
 *  just 0 or 100 — empty or full, matching the same card shape used one
 *  and two levels up instead of a different "done/not done" treatment. */
export function TrainingChapterLessons({
  lessons,
  completedLessonIds,
}: {
  lessons: Lesson[];
  completedLessonIds: string[];
}) {
  const completedSet = new Set(completedLessonIds);

  if (lessons.length === 0) {
    return (
      <p className="text-sm text-muted">No lessons in this chapter yet.</p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {lessons.map((lesson, lessonIndex) => (
        <TrainingTile
          key={lesson.id}
          href={`/agent/training/lessons/${lesson.id}`}
          eyebrow={`Lesson ${lessonIndex + 1}`}
          title={lesson.title}
          description={lesson.description}
          pct={completedSet.has(lesson.id) ? 100 : 0}
          fallbackIcon={<PlayCircle className="h-4.5 w-4.5" />}
        />
      ))}
    </div>
  );
}
