import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { computeAgencyKpis, computeTopProducers, computeRecentActivity } from "@/lib/agencyDashboard";
import { DASHBOARD_RANGES, DashboardRange } from "@/lib/dashboardRange";
import { computeProductionTimeline, computeCarrierAnalytics, computeProductAnalytics, computePolicyStatusAnalytics } from "@/lib/productionAnalytics";
import { generateDemoPolicies, demoRecentActivity, generateDemoAgencyPolicies, demoAgencyRecentActivity } from "@/lib/demoData";

export async function GET(req: NextRequest) {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  const { searchParams } = new URL(req.url);
  const rangeParam = searchParams.get("range");
  const range: DashboardRange = DASHBOARD_RANGES.includes(rangeParam as DashboardRange)
    ? (rangeParam as DashboardRange)
    : "monthly";

  try {
    const userId = guard.session.user.id;

    // Demo Mode overlay: this viewer's own contribution to the org-wide
    // totals swaps to fake production (replacing their real rows, not
    // stacking on top), and so does every other active agent's — the whole
    // Agency Dashboard reads as one thriving agency for this viewer instead
    // of just their own number next to everyone else's real (near-empty)
    // rows. Still per-viewer and read-time-only: nothing is written back to
    // the database, and no one else's own view changes.
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { name: true, profileImageUrl: true, demoModeEnabled: true, agencyDashboardEnabled: true },
    });

    if (!user?.agencyDashboardEnabled) {
      return NextResponse.json({ error: "Agency Dashboard access has been turned off for this account" }, { status: 403 });
    }

    const demoPolicies = user?.demoModeEnabled ? generateDemoPolicies() : null;
    const agentName = user?.name ?? "Agent";
    const agentProfileImageUrl = user?.profileImageUrl ?? null;

    let agencyDemoPolicies: ReturnType<typeof generateDemoAgencyPolicies> = [];
    if (demoPolicies) {
      const otherAgents = await db.user.findMany({
        where: { active: true, id: { not: userId } },
        select: { id: true, name: true, profileImageUrl: true },
      });
      agencyDemoPolicies = generateDemoAgencyPolicies(otherAgents);
    }
    const excludeAgentIds = demoPolicies ? [userId, ...agencyDemoPolicies.map((p) => p.agentId)] : [];

    const kpiOverlay = demoPolicies ? { excludeAgentIds, rows: [...demoPolicies, ...agencyDemoPolicies] } : undefined;
    const topProducerOverlay = demoPolicies
      ? {
          agentIds: excludeAgentIds,
          rows: [
            ...demoPolicies.map((p) => ({ ...p, agentId: userId, agentName, agentProfileImageUrl })),
            ...agencyDemoPolicies,
          ],
        }
      : undefined;
    const recentActivityOverlay = demoPolicies
      ? {
          agentIds: excludeAgentIds,
          items: [...demoRecentActivity(demoPolicies, agentName, 8), ...demoAgencyRecentActivity(agencyDemoPolicies, 8)]
            .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
            .slice(0, 8),
        }
      : undefined;
    const analyticsOverlay = demoPolicies ? { excludeAgentIds, rows: [...demoPolicies, ...agencyDemoPolicies] } : undefined;

    const [kpis, topProducers, recentActivity, timeline, carriers, products, statusAnalytics] = await Promise.all([
      computeAgencyKpis(range, undefined, kpiOverlay),
      computeTopProducers(range, undefined, 5, topProducerOverlay),
      computeRecentActivity(8, recentActivityOverlay),
      computeProductionTimeline(null, range, undefined, analyticsOverlay),
      computeCarrierAnalytics(null, range, undefined, analyticsOverlay),
      computeProductAnalytics(null, range, undefined, analyticsOverlay),
      computePolicyStatusAnalytics(null, range, undefined, analyticsOverlay),
    ]);

    return NextResponse.json({
      kpis,
      topProducers,
      recentActivity,
      analytics: { timeline, carriers, products, statusAnalytics },
    });
  } catch (err) {
    console.error("GET /api/portal/agency/overview failed:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to load agency dashboard" }, { status: 500 });
  }
}
