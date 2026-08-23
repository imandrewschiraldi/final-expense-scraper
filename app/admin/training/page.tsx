import { db } from "@/lib/db";
import { TrainingPanel } from "@/components/admin/TrainingPanel";
import { PageHeading } from "@/components/portal/PageHeading";

export const dynamic = "force-dynamic";

export default async function AdminTrainingPage() {
  const modules = await db.trainingModule.findMany({
    orderBy: { order: "asc" },
    include: { lessons: { orderBy: { order: "asc" } } },
  });

  return (
    <div>
      <PageHeading slug="training" alt="Training" />
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
