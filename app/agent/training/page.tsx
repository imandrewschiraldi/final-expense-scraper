import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { TrainingModuleList } from "@/components/agent/TrainingModuleList";
import { PageHeading } from "@/components/portal/PageHeading";

export const dynamic = "force-dynamic";

export default async function AgentTrainingPage() {
  const session = await auth();
  const agentId = session!.user.id;

  const [modules, progress] = await Promise.all([
    db.trainingModule.findMany({
      orderBy: { order: "asc" },
      include: { lessons: { orderBy: { order: "asc" } } },
    }),
    db.trainingProgress.findMany({
      where: { agentId },
      select: { lessonId: true },
    }),
  ]);

  const completedLessonIds = progress.map((p) => p.lessonId);

  return (
    <div>
      <PageHeading slug="training" alt="Training" />
      {modules.length === 0 ? (
        <p className="text-sm text-muted">No training modules have been added yet — check back soon.</p>
      ) : (
        <TrainingModuleList
          modules={modules.map((m) => ({
            ...m,
            lessons: m.lessons.map((l) => ({ id: l.id, title: l.title, description: l.description })),
          }))}
          completedLessonIds={completedLessonIds}
        />
      )}
    </div>
  );
}
