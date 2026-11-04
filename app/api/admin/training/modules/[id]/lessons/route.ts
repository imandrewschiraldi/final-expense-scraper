import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id: moduleId } = await params;
  const body = await req.json();
  const { title, description, videos, images } = body as {
    title?: string;
    description?: string;
    videos?: { url: string; thumbnailUrl?: string | null }[];
    images?: string[];
  };
  const lessonVideos = (videos ?? [])
    .map((v) => ({ url: v.url.trim(), thumbnailUrl: v.thumbnailUrl ?? null }))
    .filter((v) => v.url.length > 0);

  if (!title || (lessonVideos.length === 0 && !images?.length)) {
    return NextResponse.json(
      {
        error:
          "title and either a video link or at least one photo are required",
      },
      { status: 400 },
    );
  }

  const maxOrder = await db.trainingLesson.aggregate({
    where: { moduleId },
    _max: { order: true },
  });

  const lesson = await db.trainingLesson.create({
    data: {
      moduleId,
      title,
      description: description ?? null,
      order: (maxOrder._max.order ?? 0) + 1,
      images: { create: (images ?? []).map((url, i) => ({ url, order: i })) },
      videos: {
        create: lessonVideos.map((v, i) => ({ ...v, order: i })),
      },
    },
    include: {
      images: { orderBy: { order: "asc" } },
      videos: { orderBy: { order: "asc" } },
    },
  });

  return NextResponse.json({ lesson }, { status: 201 });
}
