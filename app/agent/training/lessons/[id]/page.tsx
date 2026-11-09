import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { TrainingLessonView } from "@/components/agent/TrainingLessonView";
import { getEmbedInfo, isDirectVideoUrl } from "@/lib/videoEmbed";
import { getYoutubeChannelInfo } from "@/lib/youtubeChannel";

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
      chapter: { include: { module: true } },
      images: { orderBy: { order: "asc" } },
      videos: { orderBy: { order: "asc" } },
    },
  });

  if (!lesson) {
    notFound();
  }

  const [moduleChapters, progress] = await Promise.all([
    // Scoped to this lesson's own module, not every lesson in the whole
    // course — Prev/Next move through every chapter's lessons in order;
    // reaching the end of the module hands off to the training overview
    // (see nextId below) instead of sliding into the next module unannounced.
    db.trainingChapter.findMany({
      where: { moduleId: lesson.chapter.moduleId },
      orderBy: { order: "asc" },
      include: {
        lessons: { orderBy: { order: "asc" }, select: { id: true } },
      },
    }),
    db.trainingProgress.findUnique({
      where: { agentId_lessonId: { agentId, lessonId: id } },
    }),
  ]);

  const lessonIds = moduleChapters.flatMap((c) => c.lessons.map((l) => l.id));
  const index = lessonIds.indexOf(id);
  const prevId = index > 0 ? lessonIds[index - 1] : null;
  const nextId =
    index >= 0 && index < lessonIds.length - 1 ? lessonIds[index + 1] : null;

  // Only a link that isn't a single embeddable/playable video is ever a
  // whole channel to look up — a trackable video never needs this.
  const videos = await Promise.all(
    lesson.videos.map(async (v) => {
      const isLinkOnly = !getEmbedInfo(v.url) && !isDirectVideoUrl(v.url);
      const channelInfo = isLinkOnly
        ? await getYoutubeChannelInfo(v.url)
        : null;
      return {
        id: v.id,
        url: v.url,
        thumbnailUrl: v.thumbnailUrl,
        channelInfo,
      };
    }),
  );

  return (
    <TrainingLessonView
      lesson={{
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        videos,
        images: lesson.images.map((img) => ({ id: img.id, url: img.url })),
        moduleTitle: lesson.chapter.module.title,
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
