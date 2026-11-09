import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const body = await req.json();
  const { title, description, videos, images, chapterId } = body as {
    title?: string;
    description?: string;
    videos?: { url: string; thumbnailUrl?: string | null }[];
    images?: string[];
    chapterId?: string;
  };

  // Moving a lesson into a different chapter — dropped at the end of that
  // chapter's own lesson order, not wherever its old order value happened
  // to land among the new chapter's existing lessons.
  let newOrder: number | undefined;
  if (chapterId !== undefined) {
    const maxOrder = await db.trainingLesson.aggregate({
      where: { chapterId },
      _max: { order: true },
    });
    newOrder = (maxOrder._max.order ?? -1) + 1;
  }

  const lesson = await db.trainingLesson.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(chapterId !== undefined ? { chapterId, order: newOrder } : {}),
      // Full replace rather than a diff — the admin panel always sends the
      // complete current video/image list, same as it does for every other
      // field.
      ...(videos !== undefined
        ? {
            videos: {
              deleteMany: {},
              create: videos
                .map((v) => ({
                  url: v.url.trim(),
                  thumbnailUrl: v.thumbnailUrl ?? null,
                }))
                .filter((v) => v.url.length > 0)
                .map((v, i) => ({ ...v, order: i })),
            },
          }
        : {}),
      ...(images !== undefined
        ? {
            images: {
              deleteMany: {},
              create: images.map((url, i) => ({ url, order: i })),
            },
          }
        : {}),
    },
    include: {
      images: { orderBy: { order: "asc" } },
      videos: { orderBy: { order: "asc" } },
    },
  });

  return NextResponse.json({ lesson });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  await db.trainingLesson.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
