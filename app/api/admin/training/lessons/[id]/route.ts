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
  const { title, description, videos, images } = body as {
    title?: string;
    description?: string;
    videos?: string[];
    images?: string[];
  };

  const lesson = await db.trainingLesson.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(description !== undefined ? { description } : {}),
      // Full replace rather than a diff — the admin panel always sends the
      // complete current video/image list, same as it does for every other
      // field.
      ...(videos !== undefined
        ? {
            videos: {
              deleteMany: {},
              create: videos
                .map((v) => v.trim())
                .filter(Boolean)
                .map((url, i) => ({ url, order: i })),
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
