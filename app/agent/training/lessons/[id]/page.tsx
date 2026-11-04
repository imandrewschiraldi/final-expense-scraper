import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { TrainingLessonView } from "@/components/agent/TrainingLessonView";

export const dynamic = "force-dynamic";

export default async function AgentTrainingLessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const agentId = session!.user.id;

  const lesson = await db.trainingLesson.findUnique({
    where: { id },
    include: {
      module: true,
      images: { orderBy: { order: "asc" } },
      videos: { orderBy: { order: "asc" } },
    },
  });

  if (!lesson) {
    notFound();
  }

  const [moduleLessons, progress] = await Promise.all([
    // Scoped to this lesson's own module, not every lesson in the whole
    // course — Prev/Next only ever move within a module; reaching the end
    // of one hands off to the training overview (see nextId below)
    // instead of sliding straight into the next module unannounced.
    db.trainingLesson.findMany({
      where: { moduleId: lesson.moduleId },
      orderBy: { order: "asc" },
      select: { id: true },
    }),
    db.trainingProgress.findUnique({
      where: { agentId_lessonId: { agentId, lessonId: id } },
    }),
  ]);

  const lessonIds = moduleLessons.map((l) => l.id);
  const index = lessonIds.indexOf(id);
  const prevId = index > 0 ? lessonIds[index - 1] : null;
  const nextId =
    index >= 0 && index < lessonIds.length - 1 ? lessonIds[index + 1] : null;

  return (
    <TrainingLessonView
      lesson={{
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        videos: lesson.videos.map((v) => ({
          id: v.id,
          url: v.url,
          thumbnailUrl: v.thumbnailUrl,
        })),
        images: lesson.images.map((img) => ({ id: img.id, url: img.url })),
        moduleTitle: lesson.module.title,
      }}
      isCompleted={!!progress}
      navigation={{
        prevId,
        nextId,
        position: index >= 0 ? index + 1 : null,
        total: lessonIds.length,
      }}
    />
  );
}
