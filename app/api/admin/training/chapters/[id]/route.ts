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
  const { title } = body as { title?: string };

  if (title !== undefined && !title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const chapter = await db.trainingChapter.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title: title.trim() } : {}),
    },
  });

  return NextResponse.json({ chapter });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  await db.trainingChapter.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
