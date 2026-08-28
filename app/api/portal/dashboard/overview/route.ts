import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/apiAuth";
import { computePersonalKpis, activeGoalsFor, recentWinsFor, computeCommissionsPaidCard } from "@/lib/personalDashboard";
import { DASHBOARD_RANGES, DashboardRange } from "@/lib/dashboardRange";
import { computeProductionTimeline, computeCarrierAnalytics, computeProductAnalytics, computePolicyStatusAnalytics } from "@/lib/productionAnalytics";

export async function GET(req: NextRequest) {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  const userId = guard.session.user.id;
  const { searchParams } = new URL(req.url);
  const rangeParam = searchParams.get("range");
  const range: DashboardRange = DASHBOARD_RANGES.includes(rangeParam as DashboardRange)
    ? (rangeParam as DashboardRange)
    : "monthly";

  try {
    const [kpis, goals, recentWins, timeline, carriers, products, statusAnalytics, commissionsPaid] = await Promise.all([
      computePersonalKpis(userId, range),
      activeGoalsFor(userId),
      recentWinsFor(userId),
      computeProductionTimeline(userId, range),
      computeCarrierAnalytics(userId, range),
      computeProductAnalytics(userId, range),
      computePolicyStatusAnalytics(userId, range),
      computeCommissionsPaidCard(userId, range),
    ]);

    return NextResponse.json({
      kpis,
      goals,
      recentWins,
      analytics: { timeline, carriers, products, statusAnalytics },
      commissionsPaid,
    });
  } catch (err) {
    console.error("GET /api/portal/dashboard/overview failed:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to load dashboard" }, { status: 500 });
  }
}
