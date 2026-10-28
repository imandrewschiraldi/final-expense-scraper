"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";

type Lesson = { id: string; title: string; description: string | null };
type Module = { id: string; title: string; description: string | null; lessons: Lesson[] };

function CheckCircle({ done }: { done: boolean }) {
  return (
    <div
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
        done ? "border-green bg-green" : "border-muted",
      )}
    >
      {done && (
        <svg viewBox="0 0 12 10" className="h-2.5 w-2.5 stroke-white" strokeWidth={3} fill="none">
          <polyline points="1,5 4,9 11,1" />
        </svg>
      )}
    </div>
  );
}

// A ring instead of the old linear bar — reads as a "course progress" badge
// next to the module header rather than a loading-bar-style strip.
function ProgressRing({ pct }: { pct: number }) {
  const size = 46;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, pct)) / 100) * c;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" className="stroke-surface2" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="stroke-copper transition-[stroke-dashoffset] duration-300"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white">
        {pct}%
      </span>
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
    <div className="space-y-8">
      {modules.map((module_, moduleIndex) => {
        const total = module_.lessons.length;
        const completed = module_.lessons.filter((l) => completedSet.has(l.id)).length;
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

        return (
          <div key={module_.id} className="rounded-[14px] border border-border bg-surface p-6">
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-border pb-5">
              <div className="flex items-start gap-4">
                <span className="font-condensed metal-copper-text text-3xl font-black leading-none">
                  {String(moduleIndex + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="font-condensed text-[11px] font-bold tracking-[0.14em] text-muted uppercase">
                    Module {moduleIndex + 1}
                  </p>
                  <h3 className="font-condensed text-lg font-extrabold text-white uppercase">{module_.title}</h3>
                  {module_.description && <p className="mt-1 text-sm text-muted">{module_.description}</p>}
                </div>
              </div>
              <ProgressRing pct={pct} />
            </div>

            {total === 0 ? (
              <p className="text-sm text-muted">No lessons in this module yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {module_.lessons.map((lesson, lessonIndex) => (
                  <Link
                    key={lesson.id}
                    href={`/agent/training/lessons/${lesson.id}`}
                    className="group flex flex-col gap-2 rounded-lg border border-border bg-surface2 p-4 transition-colors hover:border-copper-dim-gradient"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-condensed text-[10px] font-bold tracking-[0.12em] text-muted uppercase">
                        Lesson {lessonIndex + 1}
                      </span>
                      <CheckCircle done={completedSet.has(lesson.id)} />
                    </div>
                    <p className="line-clamp-2 text-sm font-semibold text-white">{lesson.title}</p>
                    {lesson.description && (
                      <p className="line-clamp-2 text-xs text-muted">{lesson.description}</p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
