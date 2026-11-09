"use client";

import Link from "next/link";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/cn";

type Lesson = { id: string };
type Chapter = { id: string; title: string; lessons: Lesson[] };

function ProgressRing({ pct }: { pct: number }) {
  const size = 40;
  const stroke = 3.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, pct)) / 100) * c;
  return (
    <div
      className="relative shrink-0 rounded-full bg-black/55 backdrop-blur-sm"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          fill="none"
          className="stroke-white/20"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn(
            "transition-[stroke-dashoffset] duration-300",
            pct >= 100 ? "stroke-green" : "stroke-copper",
          )}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
        {pct}%
      </span>
    </div>
  );
}

/** A chapter's own tile has no cover photo to fall back to (chapters don't
 *  carry a thumbnail in the schema, unlike modules) — every chapter gets
 *  the same branded gradient-plus-number treatment instead, so the grid
 *  still reads as a finished product rather than a row of blank boxes. */
function ChapterCover({ chapterNumber }: { chapterNumber: number }) {
  return (
    <div
      className="flex h-full w-full items-center justify-center"
      style={{
        backgroundImage:
          "linear-gradient(135deg, rgb(202 126 64 / 0.22) 0%, rgb(172 90 42 / 0.16) 45%, rgb(20 10 5 / 0.9) 100%)",
      }}
    >
      <div className="flex flex-col items-center gap-1.5 text-white/25">
        <BookOpen className="h-8 w-8" strokeWidth={1.25} />
        <span className="font-condensed text-3xl font-black">
          {String(chapterNumber).padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}

/** A module's own page — every chapter as a small square tile, same
 *  treatment as the module grid one level up. Picking one drills into
 *  that chapter's lesson breakdown. */
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
          <Link
            key={chapter.id}
            href={`/agent/training/modules/${moduleId}/chapters/${chapter.id}`}
            className="group relative aspect-square overflow-hidden rounded-2xl border-copper-dim-gradient bg-surface shadow-[0_16px_32px_-16px_rgba(0,0,0,0.75)] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-16px_rgba(0,0,0,0.85)]"
          >
            <ChapterCover chapterNumber={chapterIndex + 1} />
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(to top, rgb(10 6 3 / 0.92) 0%, rgb(10 6 3 / 0.55) 40%, transparent 70%)",
              }}
            />
            <div className="absolute top-2 right-2">
              <ProgressRing pct={pct} />
            </div>
            <div className="absolute inset-x-0 bottom-0 p-3">
              <p className="font-condensed metal-copper-text text-[10px] font-bold tracking-[0.18em] uppercase">
                Chapter {chapterIndex + 1}
              </p>
              <h3 className="font-condensed line-clamp-2 text-sm font-extrabold text-white uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] sm:text-base">
                {chapter.title}
              </h3>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
