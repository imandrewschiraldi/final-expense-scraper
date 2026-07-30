import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/apiAuth";
import { db } from "@/lib/db";

// Always a live, all-time ranking — no period selector. Sales leaderboards
// that reset weekly/monthly hide who's actually ahead right now; this stays
// continuous and just reflects current standings as they change. Every
// active agent/manager is included (even at $0), so new accounts show up
// on the board immediately instead of waiting for their first issued policy.
export async function GET() {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  const [agents, policies] = await Promise.all([
    db.user.findMany({
      where: { active: true, role: { in: ["AGENT", "MANAGER"] } },
      select: { id: true, name: true, profileImageUrl: true },
    }),
    db.policy.findMany({
      where: { status: "ISSUED", agentId: { not: null } },
      select: { annualPremium: true, agentId: true },
    }),
  ]);

  const byAgent = new Map<string, { id: string; name: string; profileImageUrl: string | null; issuedAP: number; issuedCount: number }>();
  for (const a of agents) {
    byAgent.set(a.id, { id: a.id, name: a.name, profileImageUrl: a.profileImageUrl, issuedAP: 0, issuedCount: 0 });
  }
  for (const p of policies) {
    if (!p.agentId) continue;
    const entry = byAgent.get(p.agentId);
    if (!entry) continue;
    entry.issuedAP += Number(p.annualPremium);
    entry.issuedCount += 1;
  }

  const rankings = Array.from(byAgent.values()).sort((a, b) => b.issuedAP - a.issuedAP);

  return NextResponse.json({ rankings });
}
