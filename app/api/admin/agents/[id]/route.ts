import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const body = await req.json();
  const { name, licensedStates, active } = body as {
    name?: string;
    licensedStates?: string[];
    active?: boolean;
  };

  const agent = await db.user.update({
    where: { id, role: "AGENT" },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(licensedStates !== undefined ? { licensedStates: licensedStates.map((s) => s.toUpperCase()) } : {}),
      ...(active !== undefined ? { active } : {}),
    },
    select: { id: true, name: true, email: true, licensedStates: true, active: true },
  });

  return NextResponse.json({ agent });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;

  const agent = await db.user.findUnique({ where: { id } });
  if (!agent || agent.role !== "AGENT") {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }
  if (agent.active) {
    return NextResponse.json({ error: "Deactivate this agent before deleting them" }, { status: 400 });
  }

  // Leads assigned to this agent fall back to unassigned (SET NULL); notes
  // they authored are kept but lose attribution (SET NULL) — deleting the
  // agent doesn't erase lead history.
  await db.user.delete({ where: { id } });

  return NextResponse.json({ deleted: true });
}
