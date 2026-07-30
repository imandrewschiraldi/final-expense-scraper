import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/apiAuth";
import { db } from "@/lib/db";

// Always a live, all-time ranking — no period selector. Sales leaderboards
// that reset weekly/monthly hide who's actually ahead right now; this stays
// continuous and just reflects current standings as they change.
export async function GET() {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  const policies = await db.policy.findMany({
    where: { status: "ISSUED", agentId: { not: null } },
    select: { annualPremium: true, agent: { select: { id: true, name: true, profileImageUrl: true } } },
  });

  const byAgent = new Map<string, { id: string; name: string; profileImageUrl: string | null; issuedAP: number; issuedCount: number }>();
  for (const p of policies) {
    if (!p.agent) continue;
    const entry = byAgent.get(p.agent.id) ?? {
      id: p.agent.id,
      name: p.agent.name,
      profileImageUrl: p.agent.profileImageUrl,
      issuedAP: 0,
      issuedCount: 0,
    };
    entry.issuedAP += Number(p.annualPremium);
    entry.issuedCount += 1;
    byAgent.set(p.agent.id, entry);
  }

  const rankings = Array.from(byAgent.values()).sort((a, b) => b.issuedAP - a.issuedAP);

  return NextResponse.json({ rankings });
}
