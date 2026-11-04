"use client";

import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/cn";

type Lesson = { id: string; title: string; description: string | null };
type Module = {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  lessons: Lesson[];
};

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

// A ring rather than a bar — compact enough to float directly on the cover
// image without needing its own row, and reads unambiguously as "course
// progress" wherever it's dropped.
function ProgressRing({ pct }: { pct: number }) {
  const size = 48;
  const stroke = 4;
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
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white">
        {pct}%
      </span>
    </div>
  );
}

/** The module's cover — its own thumbnail when it has one, or a tasteful
 *  branded placeholder (not a blank box) when it doesn't, so a course
 *  that hasn't had images added yet still reads as a finished product,
 *  not a half-built admin screen. */
function ModuleCover({
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
      <div className="flex flex-col items-center gap-2 text-white/25">
        <GraduationCap className="h-12 w-12" strokeWidth={1.25} />
        <span className="font-condensed text-5xl font-black">
          {String(moduleNumber).padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}

export function TrainingModuleList({
  modules,
  completedLessonIds,
}: {
  modules: Module[];
  completedLessonIds: string[];
}) {
  const completedSet = new Set(completedLessonIds);

  return (
    <div className="space-y-10">
      {modules.map((module_, moduleIndex) => {
        const total = module_.lessons.length;
        const completed = module_.lessons.filter((l) =>
          completedSet.has(l.id),
        ).length;
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

        return (
          <div
            key={module_.id}
            className="overflow-hidden rounded-2xl border-copper-dim-gradient bg-surface shadow-[0_24px_48px_-20px_rgba(0,0,0,0.75)]"
          >
            <div className="relative aspect-[21/9] w-full sm:aspect-[21/6]">
              <ModuleCover
                url={module_.thumbnailUrl}
                moduleNumber={moduleIndex + 1}
              />
              {/* Scrim just at the bottom, not the whole image, so the
                  cover art itself still reads clearly above the caption. */}
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "linear-gradient(to top, rgb(10 6 3 / 0.92) 0%, rgb(10 6 3 / 0.55) 35%, transparent 70%)",
                }}
              />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 sm:p-6">
                <div className="min-w-0">
                  <p className="font-condensed metal-copper-text text-[11px] font-bold tracking-[0.2em] uppercase">
                    Module {moduleIndex + 1}
                  </p>
                  <h3 className="font-condensed truncate text-2xl font-extrabold text-white uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] sm:text-3xl">
                    {module_.title}
                  </h3>
                </div>
                <ProgressRing pct={pct} />
              </div>
            </div>

            <div className="p-6">
              {module_.description && (
                <p className="mb-5 text-sm text-muted">{module_.description}</p>
              )}

              {total === 0 ? (
                <p className="text-sm text-muted">
                  No lessons in this module yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {module_.lessons.map((lesson, lessonIndex) => (
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
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
