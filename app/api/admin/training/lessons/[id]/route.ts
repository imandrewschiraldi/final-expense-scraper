import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const body = await req.json();
  const { title, description, videoUrl, images } = body as {
    title?: string;
    description?: string;
    videoUrl?: string;
    images?: string[];
  };

  const lesson = await db.trainingLesson.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(videoUrl !== undefined ? { videoUrl: videoUrl || null } : {}),
      // Full replace rather than a diff — the admin panel always sends the
      // complete current image list, same as it does for every other field.
      ...(images !== undefined
        ? { images: { deleteMany: {}, create: images.map((url, i) => ({ url, order: i })) } }
        : {}),
    },
    include: { images: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ lesson });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  await db.trainingLesson.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
