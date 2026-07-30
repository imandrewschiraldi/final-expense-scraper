import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/apiAuth";
import { computePersonalKpis, activeGoalsFor, recentWinsFor } from "@/lib/personalDashboard";
import {
  ANALYTICS_RANGES,
  AnalyticsRange,
  computeProductionTimeline,
  computeCarrierAnalytics,
  computeProductAnalytics,
  computePolicyStatusAnalytics,
} from "@/lib/productionAnalytics";

export async function GET(req: NextRequest) {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  const userId = guard.session.user.id;
  const { searchParams } = new URL(req.url);
  const rangeParam = searchParams.get("range");
  const range: AnalyticsRange = ANALYTICS_RANGES.includes(rangeParam as AnalyticsRange)
    ? (rangeParam as AnalyticsRange)
    : "monthly";

  const [kpis, goals, recentWins, timeline, carriers, products, statusAnalytics] = await Promise.all([
    computePersonalKpis(userId),
    activeGoalsFor(userId),
    recentWinsFor(userId),
    computeProductionTimeline(userId, range),
    computeCarrierAnalytics(userId, range),
    computeProductAnalytics(userId, range),
    computePolicyStatusAnalytics(userId, range),
  ]);

  return NextResponse.json({
    kpis,
    goals,
    recentWins,
    analytics: { timeline, range, carriers, products, statusAnalytics },
  });
}
