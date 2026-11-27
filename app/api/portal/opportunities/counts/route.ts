import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { LEAD_TYPES } from "@/lib/leadType";

// Powers the pipeline dropdown's live "N opportunities" counts across all
// ten pipelines (5 products x Lead/Client) in one call, scoped the same way
// /api/portal/opportunities is.
export async function GET() {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  // Book of Business is always the viewing agent's own book — see
  // /api/portal/opportunities for the full reasoning.
  const agentId = guard.session.user.id;

  const [leadCounts, policyCounts] = await Promise.all([
    db.lead.groupBy({
      by: ["leadType"],
      where: { isArchived: false, assignedAgentId: agentId },
      _count: { _all: true },
    }),
    db.policy.groupBy({
      by: ["leadType"],
      where: { agentId },
      _count: { _all: true },
    }),
  ]);

  const counts: Record<string, { LEAD: number; CLIENT: number }> = {};
  for (const leadType of LEAD_TYPES) counts[leadType] = { LEAD: 0, CLIENT: 0 };
  for (const row of leadCounts) counts[row.leadType].LEAD = row._count._all;
  for (const row of policyCounts) {
    if (row.leadType) counts[row.leadType].CLIENT = row._count._all;
  }

  return NextResponse.json({ counts });
}
