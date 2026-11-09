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
  const { title } = body as { title?: string };

  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const maxOrder = await db.trainingChapter.aggregate({
    where: { moduleId },
    _max: { order: true },
  });

  const chapter = await db.trainingChapter.create({
    data: {
      moduleId,
      title: title.trim(),
      order: (maxOrder._max.order ?? 0) + 1,
    },
    include: {
      lessons: {
        orderBy: { order: "asc" },
        include: {
          images: { orderBy: { order: "asc" } },
          videos: { orderBy: { order: "asc" } },
        },
      },
    },
  });

  return NextResponse.json({ chapter }, { status: 201 });
}

/** Drag-to-reorder for a module's chapter list — same shape as the
 *  lessons reorder endpoint: the full ordered id list, applied as a
 *  single transaction, and scoped to chapters that actually belong to
 *  this module. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id: moduleId } = await params;
  const body = await req.json();
  const { reorder } = body as { reorder?: unknown };

  if (
    !Array.isArray(reorder) ||
    !reorder.every((v) => typeof v === "string")
  ) {
    return NextResponse.json(
      { error: "reorder must be an array of chapter ids" },
      { status: 400 },
    );
  }

  const chapters = await db.trainingChapter.findMany({
    where: { moduleId },
    select: { id: true },
  });
  const validIds = new Set(chapters.map((c) => c.id));
  const ids = reorder.filter((id) => validIds.has(id));

  await db.$transaction(
    ids.map((id, index) =>
      db.trainingChapter.update({ where: { id }, data: { order: index } }),
    ),
  );

  return NextResponse.json({ ok: true });
}
