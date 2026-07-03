import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { createAndSendInvite } from "@/lib/invite";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const agent = await db.user.findUnique({ where: { id, role: "AGENT" } });
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  try {
    await createAndSendInvite(agent);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send invite email" },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
