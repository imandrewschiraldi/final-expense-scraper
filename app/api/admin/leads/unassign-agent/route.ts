import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";

// Pulls every lead currently assigned to one agent back into the unassigned
// pool — not the vault, since these are leads the agency already knows the
// disposition of, not fresh ones for the shared 90-day pool. Marked
// wasRecycled so they surface under "Previously Assigned" in All Leads
// instead of looking indistinguishable from a lead nobody has ever worked.
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { agentId } = (await req.json().catch(() => ({}))) as { agentId?: string };
  if (!agentId) return NextResponse.json({ error: "agentId is required" }, { status: 400 });

  const result = await db.lead.updateMany({
    where: { assignedAgentId: agentId, isArchived: false, isVaulted: false },
    data: { assignedAgentId: null, assignedAt: null, wasRecycled: true },
  });

  return NextResponse.json({ unassigned: result.count });
}
