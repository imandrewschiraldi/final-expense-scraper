import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/apiAuth";
import { computePersonalKpis, activeGoalsFor, recentWinsFor } from "@/lib/personalDashboard";
import {
  TIMELINE_GRANULARITIES,
  TimelineGranularity,
  computeProductionTimeline,
  computeRolling8Week,
  compute12MonthTrend,
  computeHeatMap,
  computeCarrierAnalytics,
  computeProductAnalytics,
  computePolicyStatusAnalytics,
} from "@/lib/productionAnalytics";

export async function GET(req: NextRequest) {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  const userId = guard.session.user.id;
  const { searchParams } = new URL(req.url);
  const granularityParam = searchParams.get("granularity");
  const granularity: TimelineGranularity = TIMELINE_GRANULARITIES.includes(granularityParam as TimelineGranularity)
    ? (granularityParam as TimelineGranularity)
    : "monthly";

  const [kpis, goals, recentWins, timeline, rolling8Week, trend12Month, heatmap, carriers, products, statusAnalytics] =
    await Promise.all([
      computePersonalKpis(userId),
      activeGoalsFor(userId),
      recentWinsFor(userId),
      computeProductionTimeline(userId, granularity),
      computeRolling8Week(userId),
      compute12MonthTrend(userId),
      computeHeatMap(userId),
      computeCarrierAnalytics(userId),
      computeProductAnalytics(userId),
      computePolicyStatusAnalytics(userId),
    ]);

  return NextResponse.json({
    kpis,
    goals,
    recentWins,
    analytics: { timeline, granularity, rolling8Week, trend12Month, heatmap, carriers, products, statusAnalytics },
  });
}
