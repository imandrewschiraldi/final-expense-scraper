import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { computeAgencyKpis, computeTopProducers, computeRecentActivity } from "@/lib/agencyDashboard";
import { DASHBOARD_RANGES, DashboardRange } from "@/lib/dashboardRange";
import { computeProductionTimeline, computeCarrierAnalytics, computeProductAnalytics, computePolicyStatusAnalytics } from "@/lib/productionAnalytics";
import { generateDemoPolicies, demoRecentActivity } from "@/lib/demoData";

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

    // Demo Mode overlay: only this viewer's own contribution to the
    // org-wide totals swaps to fake production (replacing their real rows,
    // not stacking on top) — same per-viewer, read-time-only rule already
    // used by the Dashboard, Book of Business, and Leaderboard.
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { name: true, profileImageUrl: true, demoModeEnabled: true },
    });
    const demoPolicies = user?.demoModeEnabled ? generateDemoPolicies() : null;
    const agentName = user?.name ?? "Agent";
    const agentProfileImageUrl = user?.profileImageUrl ?? null;

    const kpiOverlay = demoPolicies ? { excludeAgentId: userId, rows: demoPolicies } : undefined;
    const topProducerOverlay = demoPolicies
      ? { agentId: userId, agentName, agentProfileImageUrl, rows: demoPolicies }
      : undefined;
    const recentActivityOverlay = demoPolicies
      ? { agentId: userId, items: demoRecentActivity(demoPolicies, agentName, 8) }
      : undefined;
    const analyticsOverlay = demoPolicies ? { excludeAgentId: userId, rows: demoPolicies } : undefined;

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
