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
    // Flattened across every chapter in the module, in chapter then lesson
    // order — Prev/Next flow straight through the whole module instead of
    // stopping at each chapter boundary, so finishing the last lesson of
    // Chapter 1 moves right into Chapter 1 of... Chapter 2's first lesson
    // instead of dropping back to a chapter picker the agent has to
    // navigate through again. Only the very last lesson of the whole
    // module has nowhere further to go (see nextId below).
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
        moduleId: lesson.chapter.module.id,
        moduleTitle: lesson.chapter.module.title,
        chapterId: lesson.chapter.id,
        chapterTitle: lesson.chapter.title,
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
