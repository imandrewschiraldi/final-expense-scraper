"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";

type Lesson = { id: string; title: string; description: string | null };

function CheckCircle({ done }: { done: boolean }) {
  return (
    <div
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
        done ? "border-green bg-green" : "border-muted",
      )}
    >
      {done && (
        <svg
          viewBox="0 0 12 10"
          className="h-2.5 w-2.5 stroke-white"
          strokeWidth={3}
          fill="none"
        >
          <polyline points="1,5 4,9 11,1" />
        </svg>
      )}
    </div>
  );
}

/** A chapter's own page — its lessons broken down as a grid of tiles, the
 *  last stop before the actual lesson view. */
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
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {lessons.map((lesson, lessonIndex) => (
        <Link
          key={lesson.id}
          href={`/agent/training/lessons/${lesson.id}`}
          className="group flex flex-col gap-2 rounded-lg border border-border bg-surface2 p-4 transition-all hover:-translate-y-0.5 hover:border-copper-dim-gradient hover:shadow-[0_10px_24px_-12px_rgba(0,0,0,0.6)]"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-condensed text-[10px] font-bold tracking-[0.12em] text-muted uppercase">
              Lesson {lessonIndex + 1}
            </span>
            <CheckCircle done={completedSet.has(lesson.id)} />
          </div>
          <p className="line-clamp-2 text-sm font-semibold text-white">
            {lesson.title}
          </p>
          {lesson.description && (
            <p className="line-clamp-2 text-xs text-muted">
              {lesson.description}
            </p>
          )}
        </Link>
      ))}
    </div>
  );
}
