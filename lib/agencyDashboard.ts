import { db } from "@/lib/db";
import { DashboardRange, rangeSince, previousRangeWindow } from "@/lib/dashboardRange";
import { metricsForWindow } from "@/lib/personalDashboard";
import { AgencyKpiData, TopProducer, RecentActivityItem } from "@/lib/agencyDashboardShared";

export * from "@/lib/agencyDashboardShared";

export async function computeAgencyKpis(range: DashboardRange, now: Date = new Date()): Promise<AgencyKpiData> {
  const since = rangeSince(range, now);
  const prev = previousRangeWindow(range, now);

  const [current, previous, activeAgents] = await Promise.all([
    metricsForWindow(null, since ? { gte: since } : {}),
    prev ? metricsForWindow(null, { gte: prev.start, lt: prev.end }) : Promise.resolve(null),
    db.user.count({ where: { active: true, role: { in: ["AGENT", "MANAGER", "ADMIN"] } } }),
  ]);

  const withTrend = (value: number, previousValue: number | undefined) =>
    previousValue !== undefined ? { value, previousValue } : { value };

  return {
    totalAnnualPremium: withTrend(current.submittedAP, previous?.submittedAP),
    totalIssuedPremium: withTrend(current.issuedAP, previous?.issuedAP),
    totalChargebackPremium: withTrend(current.chargebackAP, previous?.chargebackAP),
    totalPoliciesSubmitted: withTrend(current.submittedCount, previous?.submittedCount),
    avgCaseSize: withTrend(current.avgCaseSize, previous?.avgCaseSize),
    activeAgents: { value: activeAgents },
  };
}

/** Ranked by issued premium within the selected window — a range-scoped companion to the Leaderboard's always-live all-time ranking. */
export async function computeTopProducers(range: DashboardRange, now: Date = new Date(), limit = 5): Promise<TopProducer[]> {
  const since = rangeSince(range, now);
  const policies = await db.policy.findMany({
    where: { status: "ISSUED", agentId: { not: null }, ...(since ? { submittedAt: { gte: since } } : {}) },
    select: { annualPremium: true, agent: { select: { id: true, name: true, profileImageUrl: true } } },
  });

  const byAgent = new Map<string, TopProducer>();
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

  return Array.from(byAgent.values())
    .sort((a, b) => b.issuedAP - a.issuedAP)
    .slice(0, limit);
}

/** Always the latest N org-wide, independent of the selected range — a "recent" feed that resets to empty on a narrow range would feel broken. */
export async function computeRecentActivity(limit = 8): Promise<RecentActivityItem[]> {
  const policies = await db.policy.findMany({
    orderBy: { submittedAt: "desc" },
    take: limit,
    select: {
      id: true,
      carrier: true,
      product: true,
      annualPremium: true,
      status: true,
      submittedAt: true,
      agent: { select: { name: true } },
    },
  });

  return policies.map((p) => ({
    id: p.id,
    agentName: p.agent?.name ?? null,
    carrier: p.carrier,
    product: p.product,
    annualPremium: Number(p.annualPremium),
    status: p.status,
    submittedAt: p.submittedAt.toISOString(),
  }));
}
