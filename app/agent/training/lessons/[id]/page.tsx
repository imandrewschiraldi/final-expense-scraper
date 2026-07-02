import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { TrainingLessonView } from "@/components/agent/TrainingLessonView";

export const dynamic = "force-dynamic";

export default async function AgentTrainingLessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const agentId = session!.user.id;

  const lesson = await db.trainingLesson.findUnique({
    where: { id },
    include: { module: true },
  });

  if (!lesson) {
    notFound();
  }

  const [allModules, progress] = await Promise.all([
    db.trainingModule.findMany({
      orderBy: { order: "asc" },
      include: { lessons: { orderBy: { order: "asc" }, select: { id: true } } },
    }),
    db.trainingProgress.findUnique({
      where: { agentId_lessonId: { agentId, lessonId: id } },
    }),
  ]);

  const flatLessonIds = allModules.flatMap((m) => m.lessons.map((l) => l.id));
  const index = flatLessonIds.indexOf(id);
  const prevId = index > 0 ? flatLessonIds[index - 1] : null;
  const nextId = index >= 0 && index < flatLessonIds.length - 1 ? flatLessonIds[index + 1] : null;

  return (
    <TrainingLessonView
      lesson={{
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        videoUrl: lesson.videoUrl,
        moduleTitle: lesson.module.title,
      }}
      isCompleted={!!progress}
      navigation={{
        prevId,
        nextId,
        position: index >= 0 ? index + 1 : null,
        total: flatLessonIds.length,
      }}
    />
  );
}
