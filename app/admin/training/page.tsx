import { db } from "@/lib/db";
import { TrainingPanel } from "@/components/admin/TrainingPanel";

export const dynamic = "force-dynamic";

export default async function AdminTrainingPage() {
  const modules = await db.trainingModule.findMany({
    orderBy: { order: "asc" },
    include: { lessons: { orderBy: { order: "asc" } } },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold tracking-wide text-white uppercase">Training</h1>
      <TrainingPanel
        initialModules={modules.map((m) => ({
          ...m,
          createdAt: m.createdAt.toISOString(),
          updatedAt: m.updatedAt.toISOString(),
          lessons: m.lessons.map((l) => ({
            ...l,
            createdAt: l.createdAt.toISOString(),
            updatedAt: l.updatedAt.toISOString(),
          })),
        }))}
      />
    </div>
  );
}
