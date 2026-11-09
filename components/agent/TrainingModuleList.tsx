"use client";

import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/cn";

type Lesson = { id: string };
type Chapter = { lessons: Lesson[] };
type Module = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  chapters: Chapter[];
};

// A ring rather than a bar — compact enough to float directly on the cover
// image without needing its own row, and reads unambiguously as "course
// progress" wherever it's dropped.
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

/** The module's cover — its own thumbnail when it has one, or a tasteful
 *  branded placeholder (not a blank box) when it doesn't, so a course
 *  that hasn't had images added yet still reads as a finished product,
 *  not a half-built admin screen. */
export function ModuleCover({
  url,
  moduleNumber,
}: {
  url: string | null;
  moduleNumber: number;
}) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className="h-full w-full object-cover" />;
  }
  return (
    <div
      className="flex h-full w-full items-center justify-center"
      style={{
        backgroundImage:
          "linear-gradient(135deg, rgb(202 126 64 / 0.22) 0%, rgb(172 90 42 / 0.16) 45%, rgb(20 10 5 / 0.9) 100%)",
      }}
    >
      <div className="flex flex-col items-center gap-1.5 text-white/25">
        <GraduationCap className="h-8 w-8" strokeWidth={1.25} />
        <span className="font-condensed text-3xl font-black">
          {String(moduleNumber).padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}

/** The course catalog's first page — every module as a small square tile,
 *  not expanded inline. Picking one drills into its own page of chapter
 *  squares (see app/agent/training/modules/[id]/page.tsx), which in turn
 *  drills into a chapter's lesson breakdown — a three-level catalog
 *  instead of one long scrolling page of everything at once. */
export function TrainingModuleList({
  modules,
  completedLessonIds,
}: {
  modules: Module[];
  completedLessonIds: string[];
}) {
  const completedSet = new Set(completedLessonIds);

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {modules.map((module_, moduleIndex) => {
        const allLessons = module_.chapters.flatMap((c) => c.lessons);
        const total = allLessons.length;
        const completed = allLessons.filter((l) =>
          completedSet.has(l.id),
        ).length;
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

        return (
          <Link
            key={module_.id}
            href={`/agent/training/modules/${module_.id}`}
            className="group relative aspect-square overflow-hidden rounded-2xl border-copper-dim-gradient bg-surface shadow-[0_16px_32px_-16px_rgba(0,0,0,0.75)] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-16px_rgba(0,0,0,0.85)]"
          >
            <ModuleCover
              url={module_.thumbnailUrl}
              moduleNumber={moduleIndex + 1}
            />
            {/* Scrim just at the bottom, not the whole image, so the cover
                art itself still reads clearly above the caption. */}
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
                Module {moduleIndex + 1}
              </p>
              <h3 className="font-condensed line-clamp-2 text-sm font-extrabold text-white uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] sm:text-base">
                {module_.title}
              </h3>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
