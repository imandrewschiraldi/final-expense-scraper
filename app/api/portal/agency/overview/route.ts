import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/apiAuth";
import { computeAgencyKpis, computeTopProducers, computeRecentActivity } from "@/lib/agencyDashboard";
import { DASHBOARD_RANGES, DashboardRange } from "@/lib/dashboardRange";
import { computeProductionTimeline, computeCarrierAnalytics, computeProductAnalytics, computePolicyStatusAnalytics } from "@/lib/productionAnalytics";

export async function GET(req: NextRequest) {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  const { searchParams } = new URL(req.url);
  const rangeParam = searchParams.get("range");
  const range: DashboardRange = DASHBOARD_RANGES.includes(rangeParam as DashboardRange)
    ? (rangeParam as DashboardRange)
    : "monthly";

  try {
    const [kpis, topProducers, recentActivity, timeline, carriers, products, statusAnalytics] = await Promise.all([
      computeAgencyKpis(range),
      computeTopProducers(range),
      computeRecentActivity(),
      computeProductionTimeline(null, range),
      computeCarrierAnalytics(null, range),
      computeProductAnalytics(null, range),
      computePolicyStatusAnalytics(null, range),
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
