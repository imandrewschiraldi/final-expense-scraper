import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { TrainingChapterLessons } from "@/components/agent/TrainingChapterLessons";
import { PageHeading } from "@/components/portal/PageHeading";

export const dynamic = "force-dynamic";

export default async function AgentTrainingChapterPage({
  params,
}: {
  params: Promise<{ id: string; chapterId: string }>;
}) {
  const { id: moduleId, chapterId } = await params;
  const session = await auth();
  const agentId = session!.user.id;

  const chapter = await db.trainingChapter.findUnique({
    where: { id: chapterId },
    select: {
      id: true,
      title: true,
      moduleId: true,
      module: { select: { title: true } },
      lessons: {
        orderBy: { order: "asc" },
        select: { id: true, title: true, description: true },
      },
    },
  });

  // The chapter must actually belong to the module in the URL — a stale
  // or tampered link shouldn't silently show a chapter from elsewhere.
  if (!chapter || chapter.moduleId !== moduleId) {
    notFound();
  }

  const lessonIds = chapter.lessons.map((l) => l.id);
  const progress = await db.trainingProgress.findMany({
    where: { agentId, lessonId: { in: lessonIds } },
    select: { lessonId: true },
  });

  return (
    <div>
      <PageHeading slug="training" alt="Training" />
      <Link
        href={`/agent/training/modules/${moduleId}`}
        className="mb-4 inline-block text-sm text-muted hover:text-foreground"
      >
        &larr; Back to {chapter.module.title}
      </Link>
      <h2 className="font-condensed mb-6 text-2xl font-extrabold text-white uppercase">
        {chapter.title}
      </h2>
      <TrainingChapterLessons
        lessons={chapter.lessons}
        completedLessonIds={progress.map((p) => p.lessonId)}
      />
    </div>
  );
}
