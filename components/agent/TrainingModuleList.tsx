"use client";

import { GraduationCap } from "lucide-react";
import { TrainingTile } from "@/components/agent/TrainingTile";

type Lesson = { id: string };
type Chapter = { lessons: Lesson[] };
type Module = {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  chapters: Chapter[];
};

/** The course catalog's first page — every module as a small tile, not
 *  expanded inline. Picking one drills into its own page of chapter tiles
 *  (see app/agent/training/modules/[id]/page.tsx), which in turn drills
 *  into a chapter's lesson breakdown — a three-level catalog instead of
 *  one long scrolling page of everything at once. */
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
          <TrainingTile
            key={module_.id}
            href={`/agent/training/modules/${module_.id}`}
            eyebrow={`Module ${moduleIndex + 1}`}
            title={module_.title}
            description={module_.description}
            pct={pct}
            coverUrl={module_.thumbnailUrl}
            fallbackIcon={<GraduationCap className="h-4.5 w-4.5" />}
          />
        );
      })}
    </div>
  );
}
