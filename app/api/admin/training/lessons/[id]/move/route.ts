import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const body = await req.json();
  const { direction } = body as { direction?: "up" | "down" };

  const lesson = await db.trainingLesson.findUnique({ where: { id }, select: { moduleId: true } });
  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  const lessons = await db.trainingLesson.findMany({
    where: { moduleId: lesson.moduleId },
    orderBy: { order: "asc" },
    select: { id: true, order: true },
  });

  const index = lessons.findIndex((l) => l.id === id);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= lessons.length) {
    return NextResponse.json({ ok: true });
  }

  const current = lessons[index];
  const swapWith = lessons[swapIndex];

  await db.$transaction([
    db.trainingLesson.update({ where: { id: current.id }, data: { order: swapWith.order } }),
    db.trainingLesson.update({ where: { id: swapWith.id }, data: { order: current.order } }),
  ]);

  return NextResponse.json({ ok: true });
}
