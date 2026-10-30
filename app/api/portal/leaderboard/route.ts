import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { generateDemoPolicies, demoLeaderboardTotals, generateDemoAgencyPolicies, demoAgencyLeaderboardTotals } from "@/lib/demoData";
import { rangeSince, type DashboardRange } from "@/lib/dashboardRange";
import { getAgencySettings } from "@/lib/agencySettings";

// A `period` query param (daily/weekly/monthly/all) lets the UI show
// different contest windows, reusing the same day/week(Mon-start)/month
// boundaries as the rest of the Dashboard. "all" is additionally gated by
// the agency-wide leaderboardAllTimeEnabled toggle (off by default) — an
// admin flips it on for everyone at once rather than it always being
// available, so a disabled "all" request below falls back to "monthly"
// same as an invalid/missing one. Every active user is included (even at
// $0), regardless of role — an admin who also personally writes business
// is still part of the agency's production, and excluding them by role
// previously meant their issued premium was silently dropped instead of
// just not ranking anyone: new accounts show up on the board immediately
// instead of waiting for their first issued policy.
const LEADERBOARD_PERIODS = ["daily", "weekly", "monthly", "all"] as const satisfies readonly DashboardRange[];
type LeaderboardPeriod = (typeof LEADERBOARD_PERIODS)[number];

function parsePeriod(value: string | null, allTimeEnabled: boolean): LeaderboardPeriod {
  if (value === "all") return allTimeEnabled ? "all" : "monthly";
  return (LEADERBOARD_PERIODS as readonly string[]).includes(value ?? "") ? (value as LeaderboardPeriod) : "monthly";
}

export async function GET(request: Request) {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  try {
    const { leaderboardAllTimeEnabled } = await getAgencySettings();
    const period = parsePeriod(new URL(request.url).searchParams.get("period"), leaderboardAllTimeEnabled);
    const since = rangeSince(period);

    const [agents, policies] = await Promise.all([
      db.user.findMany({
        where: { active: true },
        select: { id: true, name: true, profileImageUrl: true },
      }),
      db.policy.findMany({
        where: { status: "ISSUED", agentId: { not: null }, ...(since ? { issuedAt: { gte: since } } : {}) },
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

    // Demo Mode: overwrites the requesting user's own row with fake totals,
    // computed fresh per-request, AND every other active agent's row too —
    // so the board reads as one whole thriving agency for this viewer
    // instead of just their own number standing alone next to everyone
    // else's real (near-empty) production. Still entirely per-viewer and
    // read-time-only: no other row is touched in the database, and no one
    // else's own view of the board changes.
    const viewer = await db.user.findUnique({
      where: { id: guard.session.user.id },
      select: { demoModeEnabled: true },
    });
    if (viewer?.demoModeEnabled) {
      const own = byAgent.get(guard.session.user.id);
      if (own) {
        const ownPolicies = generateDemoPolicies();
        const { issuedAP, issuedCount } = demoLeaderboardTotals(since ? ownPolicies.filter((p) => p.issuedAt && p.issuedAt >= since) : ownPolicies);
        own.issuedAP = issuedAP;
        own.issuedCount = issuedCount;
      }

      const otherAgents = agents.filter((a) => a.id !== guard.session.user.id);
      const agencyPolicies = generateDemoAgencyPolicies(otherAgents);
      const agencyTotals = demoAgencyLeaderboardTotals(since ? agencyPolicies.filter((p) => p.issuedAt && p.issuedAt >= since) : agencyPolicies);
      for (const [agentId, totals] of agencyTotals) {
        const entry = byAgent.get(agentId);
        if (entry) {
          entry.issuedAP = totals.issuedAP;
          entry.issuedCount = totals.issuedCount;
        }
      }
    }

    const rankings = Array.from(byAgent.values()).sort((a, b) => b.issuedAP - a.issuedAP);

    return NextResponse.json({ rankings, period, allTimeEnabled: leaderboardAllTimeEnabled });
  } catch (err) {
    console.error("GET /api/portal/leaderboard failed:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to load leaderboard" }, { status: 500 });
  }
}
