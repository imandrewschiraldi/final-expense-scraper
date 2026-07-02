import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { TrainingModuleList } from "@/components/agent/TrainingModuleList";

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
      <h1 className="mb-6 text-2xl font-extrabold tracking-wide text-white uppercase">Training</h1>
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
