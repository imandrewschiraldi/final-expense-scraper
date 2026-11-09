import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id: chapterId } = await params;
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
    where: { chapterId },
    _max: { order: true },
  });

  const lesson = await db.trainingLesson.create({
    data: {
      chapterId,
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

/** Drag-to-reorder for a chapter's lesson list — mirrors the Announcements
 *  reorder endpoint's shape: the full ordered id list, applied as a
 *  single transaction. Only ever touches lessons that actually belong to
 *  this chapter, so a stale client can't reorder (or silently drop) a
 *  lesson that's since moved elsewhere. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id: chapterId } = await params;
  const body = await req.json();
  const { reorder } = body as { reorder?: unknown };

  if (
    !Array.isArray(reorder) ||
    !reorder.every((v) => typeof v === "string")
  ) {
    return NextResponse.json(
      { error: "reorder must be an array of lesson ids" },
      { status: 400 },
    );
  }

  const lessons = await db.trainingLesson.findMany({
    where: { chapterId },
    select: { id: true },
  });
  const validIds = new Set(lessons.map((l) => l.id));
  const ids = reorder.filter((id) => validIds.has(id));

  await db.$transaction(
    ids.map((id, index) =>
      db.trainingLesson.update({ where: { id }, data: { order: index } }),
    ),
  );

  return NextResponse.json({ ok: true });
}
