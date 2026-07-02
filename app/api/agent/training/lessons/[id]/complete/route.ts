import { NextRequest, NextResponse } from "next/server";
import { requireAgent } from "@/lib/apiAuth";
import { db } from "@/lib/db";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAgent();
  if ("error" in guard) return guard.error;

  const { id: lessonId } = await params;

  await db.trainingProgress.upsert({
    where: { agentId_lessonId: { agentId: guard.session.user.id, lessonId } },
    create: { agentId: guard.session.user.id, lessonId },
    update: {},
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAgent();
  if ("error" in guard) return guard.error;

  const { id: lessonId } = await params;

  await db.trainingProgress.deleteMany({
    where: { agentId: guard.session.user.id, lessonId },
  });

  return NextResponse.json({ ok: true });
}
