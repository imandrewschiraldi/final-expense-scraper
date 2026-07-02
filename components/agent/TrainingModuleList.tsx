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

export function TrainingModuleList({
  modules,
  completedLessonIds,
}: {
  modules: Module[];
  completedLessonIds: string[];
}) {
  const completedSet = new Set(completedLessonIds);

  return (
    <div className="space-y-6">
      {modules.map((module_, moduleIndex) => {
        const total = module_.lessons.length;
        const completed = module_.lessons.filter((l) => completedSet.has(l.id)).length;
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

        return (
          <div key={module_.id} className="rounded-[10px] border border-border bg-surface p-5">
            <div className="mb-3 flex items-center justify-between gap-4">
              <div>
                <p className="font-condensed text-[11px] font-bold tracking-[0.14em] text-copper uppercase">
                  Module {moduleIndex + 1}
                </p>
                <h3 className="font-condensed text-lg font-extrabold text-white uppercase">{module_.title}</h3>
                {module_.description && <p className="mt-1 text-sm text-muted">{module_.description}</p>}
              </div>
              <div className="w-32 shrink-0 text-right">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface2">
                  <div className="h-full rounded-full bg-copper" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-1 text-xs text-muted">
                  {completed}/{total} complete
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {module_.lessons.map((lesson) => (
                <Link
                  key={lesson.id}
                  href={`/agent/training/lessons/${lesson.id}`}
                  className="flex items-center gap-3 rounded-lg border border-border bg-surface2 px-4 py-3 transition-colors hover:border-copper-dim"
                >
                  <CheckCircle done={completedSet.has(lesson.id)} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{lesson.title}</p>
                    {lesson.description && <p className="truncate text-xs text-muted">{lesson.description}</p>}
                  </div>
                </Link>
              ))}
              {total === 0 && <p className="text-sm text-muted">No lessons in this module yet.</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
