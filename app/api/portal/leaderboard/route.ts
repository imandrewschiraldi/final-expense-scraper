import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { generateDemoPolicies, demoLeaderboardTotals } from "@/lib/demoData";

// Always a live, all-time ranking — no period selector. Sales leaderboards
// that reset weekly/monthly hide who's actually ahead right now; this stays
// continuous and just reflects current standings as they change. Every
// active user is included (even at $0), regardless of role — an admin who
// also personally writes business is still part of the agency's production,
// and excluding them by role previously meant their issued premium was
// silently dropped instead of just not ranking anyone: new accounts show up
// on the board immediately instead of waiting for their first issued policy.
export async function GET() {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  try {
    const [agents, policies] = await Promise.all([
      db.user.findMany({
        where: { active: true },
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

    // Demo Mode: only ever overwrites the requesting user's own row with
    // fake totals, computed fresh per-request — every other agent's row
    // stays completely real, so this never fakes the board for anyone else.
    const viewer = await db.user.findUnique({
      where: { id: guard.session.user.id },
      select: { demoModeEnabled: true },
    });
    if (viewer?.demoModeEnabled) {
      const own = byAgent.get(guard.session.user.id);
      if (own) {
        const { issuedAP, issuedCount } = demoLeaderboardTotals(generateDemoPolicies());
        own.issuedAP = issuedAP;
        own.issuedCount = issuedCount;
      }
    }

    const rankings = Array.from(byAgent.values()).sort((a, b) => b.issuedAP - a.issuedAP);

    return NextResponse.json({ rankings });
  } catch (err) {
    console.error("GET /api/portal/leaderboard failed:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to load leaderboard" }, { status: 500 });
  }
}
