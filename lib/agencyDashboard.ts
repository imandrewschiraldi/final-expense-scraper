import { db } from "@/lib/db";
import { DashboardRange, rangeSince, previousRangeWindow } from "@/lib/dashboardRange";
import { metricsForWindow } from "@/lib/personalDashboard";
import { AnalyticsRow, metricsFromRows } from "@/lib/productionAnalytics";
import { AgencyKpiData, TopProducer, RecentActivityItem } from "@/lib/agencyDashboardShared";

export * from "@/lib/agencyDashboardShared";

/**
 * Org-wide demo overlay for the KPI tiles: `excludeAgentId`'s real rows are
 * left out of the query (that agent's real production is replaced, not
 * stacked) and `rows` (their fake policies) are merged in before
 * aggregating — mirrors how the Leaderboard replaces just one agent's row.
 */
type AgencyKpiDemoOverlay = { excludeAgentId: string; rows: AnalyticsRow[] };

function withTrend(value: number, previousValue: number | undefined) {
  return previousValue !== undefined ? { value, previousValue } : { value };
}

export async function computeAgencyKpis(
  range: DashboardRange,
  now: Date = new Date(),
  demoOverlay?: AgencyKpiDemoOverlay,
): Promise<AgencyKpiData> {
  const since = rangeSince(range, now);
  const prev = previousRangeWindow(range, now);
  const activeAgentsPromise = db.user.count({ where: { active: true, role: { in: ["AGENT", "MANAGER", "ADMIN"] } } });

  if (!demoOverlay) {
    const [current, previous, activeAgents] = await Promise.all([
      metricsForWindow(null, since ? { gte: since } : {}),
      prev ? metricsForWindow(null, { gte: prev.start, lt: prev.end }) : Promise.resolve(null),
      activeAgentsPromise,
    ]);

    return {
      totalAnnualPremium: withTrend(current.submittedAP, previous?.submittedAP),
      totalIssuedPremium: withTrend(current.issuedAP, previous?.issuedAP),
      totalChargebackPremium: withTrend(current.chargebackAP, previous?.chargebackAP),
      totalPoliciesSubmitted: withTrend(current.submittedCount, previous?.submittedCount),
      avgCaseSize: withTrend(current.avgCaseSize, previous?.avgCaseSize),
      activeAgents: { value: activeAgents },
    };
  }

  const [realRows, activeAgents] = await Promise.all([
    db.policy.findMany({
      where: { agentId: { not: demoOverlay.excludeAgentId } },
      select: { annualPremium: true, submittedAt: true, status: true },
    }),
    activeAgentsPromise,
  ]);
  const merged = [
    ...realRows.map((r) => ({ annualPremium: Number(r.annualPremium), submittedAt: r.submittedAt, status: r.status })),
    ...demoOverlay.rows,
  ];
  const current = metricsFromRows(merged, since ? { gte: since } : {});
  const previous = prev ? metricsFromRows(merged, { gte: prev.start, lt: prev.end }) : null;

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
export async function computeTopProducers(
  range: DashboardRange,
  now: Date = new Date(),
  limit = 5,
  demoOverlay?: { agentId: string; agentName: string; agentProfileImageUrl: string | null; rows: AnalyticsRow[] },
): Promise<TopProducer[]> {
  const since = rangeSince(range, now);
  const policies = await db.policy.findMany({
    where: { status: "ISSUED", agentId: { not: null }, ...(since ? { submittedAt: { gte: since } } : {}) },
    select: { annualPremium: true, agent: { select: { id: true, name: true, profileImageUrl: true } } },
  });

  const byAgent = new Map<string, TopProducer>();
  for (const p of policies) {
    if (!p.agent) continue;
    // This viewer's real issued policies are skipped here — their row is
    // replaced wholesale by the demo totals below, not added to them.
    if (demoOverlay && p.agent.id === demoOverlay.agentId) continue;
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

  if (demoOverlay) {
    const demoIssued = demoOverlay.rows.filter((r) => r.status === "ISSUED" && (!since || r.submittedAt >= since));
    byAgent.set(demoOverlay.agentId, {
      id: demoOverlay.agentId,
      name: demoOverlay.agentName,
      profileImageUrl: demoOverlay.agentProfileImageUrl,
      issuedAP: demoIssued.reduce((sum, r) => sum + r.annualPremium, 0),
      issuedCount: demoIssued.length,
    });
  }

  return Array.from(byAgent.values())
    .sort((a, b) => b.issuedAP - a.issuedAP)
    .slice(0, limit);
}

/** Always the latest N org-wide, independent of the selected range — a "recent" feed that resets to empty on a narrow range would feel broken. */
export async function computeRecentActivity(
  limit = 8,
  demoOverlay?: { agentId: string; items: RecentActivityItem[] },
): Promise<RecentActivityItem[]> {
  const policies = await db.policy.findMany({
    where: demoOverlay ? { agentId: { not: demoOverlay.agentId } } : undefined,
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

  const real: RecentActivityItem[] = policies.map((p) => ({
    id: p.id,
    agentName: p.agent?.name ?? null,
    carrier: p.carrier,
    product: p.product,
    annualPremium: Number(p.annualPremium),
    status: p.status,
    submittedAt: p.submittedAt.toISOString(),
  }));

  if (!demoOverlay) return real;

  return [...real, ...demoOverlay.items]
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
    .slice(0, limit);
}
