import { NextResponse } from "next/server";
import { requireAgent } from "@/lib/apiAuth";
import { db } from "@/lib/db";

// Distinct states among this agent's own leads (any status, active or
// archived) so the state filter dropdown always reflects everything they
// have, not just whatever the current status/archive tab happens to show.
export async function GET() {
  const guard = await requireAgent();
  if ("error" in guard) return guard.error;

  const grouped = await db.lead.groupBy({
    by: ["state"],
    where: { assignedAgentId: guard.session.user.id },
    _count: { _all: true },
  });

  const states = grouped
    .map((g) => ({ state: g.state, count: g._count._all }))
    .sort((a, b) => a.state.localeCompare(b.state));

  return NextResponse.json({ states });
}
