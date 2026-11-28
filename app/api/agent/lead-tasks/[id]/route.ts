import { NextRequest, NextResponse } from "next/server";
import { requireAgent } from "@/lib/apiAuth";
import { db } from "@/lib/db";

async function findOwnedTask(id: string, agentId: string) {
  return db.leadTask.findFirst({
    where: { id, lead: { assignedAgentId: agentId } },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAgent();
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const agentId = guard.session.user.id;

  const existing = await findOwnedTask(id, agentId);
  if (!existing) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const data: Record<string, unknown> = {};
  if (typeof body?.title === "string" && body.title.trim()) data.title = body.title.trim();
  if (typeof body?.description === "string") data.description = body.description.trim() || null;
  if ("dueAt" in (body ?? {})) data.dueAt = body.dueAt ? new Date(body.dueAt) : null;
  if (typeof body?.completed === "boolean") data.completed = body.completed;
  if (typeof body?.assignedToId === "string") data.assignedToId = body.assignedToId;

  const task = await db.leadTask.update({
    where: { id },
    data,
    include: {
      lead: { select: { id: true, firstName: true, lastName: true, phone: true } },
      assignedTo: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json({ task });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAgent();
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const agentId = guard.session.user.id;

  const existing = await findOwnedTask(id, agentId);
  if (!existing) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  await db.leadTask.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
