import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { TrainingChapterGrid } from "@/components/agent/TrainingChapterGrid";
import { PageHeading } from "@/components/portal/PageHeading";

export const dynamic = "force-dynamic";

export default async function AgentTrainingModulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const agentId = session!.user.id;

  const module_ = await db.trainingModule.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      chapters: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          lessons: { select: { id: true } },
        },
      },
    },
  });

  if (!module_) {
    notFound();
  }

  const lessonIds = module_.chapters.flatMap((c) => c.lessons.map((l) => l.id));
  const progress = await db.trainingProgress.findMany({
    where: { agentId, lessonId: { in: lessonIds } },
    select: { lessonId: true },
  });

  return (
    <div>
      <PageHeading slug="training" alt="Training" />
      <Link
        href="/agent/training"
        className="mb-4 inline-block text-sm text-muted hover:text-foreground"
      >
        &larr; Back to Training
      </Link>
      <h2 className="font-condensed mb-1 text-2xl font-extrabold text-white uppercase">
        {module_.title}
      </h2>
      {module_.description && (
        <p className="mb-6 text-sm text-muted">{module_.description}</p>
      )}
      <TrainingChapterGrid
        moduleId={module_.id}
        chapters={module_.chapters}
        completedLessonIds={progress.map((p) => p.lessonId)}
      />
    </div>
  );
}
