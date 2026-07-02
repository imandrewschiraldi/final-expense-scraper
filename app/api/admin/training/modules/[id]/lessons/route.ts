import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id: moduleId } = await params;
  const body = await req.json();
  const { title, description, videoUrl } = body as { title?: string; description?: string; videoUrl?: string };

  if (!title || !videoUrl) {
    return NextResponse.json({ error: "title and videoUrl are required" }, { status: 400 });
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
      videoUrl,
      order: (maxOrder._max.order ?? 0) + 1,
    },
  });

  return NextResponse.json({ lesson }, { status: 201 });
}
