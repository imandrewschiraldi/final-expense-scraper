import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { computePersonalKpis, activeGoalsFor, recentWinsFor, computeCommissionsPaidCard } from "@/lib/personalDashboard";
import { DASHBOARD_RANGES, DashboardRange } from "@/lib/dashboardRange";
import { computeProductionTimeline, computeCarrierAnalytics, computeProductAnalytics, computePolicyStatusAnalytics } from "@/lib/productionAnalytics";
import {
  generateDemoPolicies,
  demoPersonalKpis,
  demoCommissionsPaidCard,
  demoProductionTimeline,
  demoCarrierAnalytics,
  demoProductAnalytics,
  demoPolicyStatusAnalytics,
  demoGoals,
  demoRecentWins,
} from "@/lib/demoData";

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
    // Demo Mode is a per-viewer read-time overlay: checked fresh against
    // this user's own row, and only ever changes what this one request
    // returns to them — never writes anything, never touches another
    // user's response.
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { name: true, profileImageUrl: true, demoModeEnabled: true },
    });

    if (user?.demoModeEnabled) {
      const demoPolicies = generateDemoPolicies();
      // Goal Completion / Goal Remaining (the KpiGrid tiles) still come
      // from the real computePersonalKpis, which derives them from this
      // user's own actual goals internally — only demoPersonalKpis' own
      // AP-derived tiles are faked, layered on top. The Goals section
      // itself (goals/recentWins below) is faked like everything else, so
      // a viewer with no goals set doesn't see it sitting empty next to a
      // page full of fake production numbers.
      const realKpis = await computePersonalKpis(userId, range);
      return NextResponse.json({
        kpis: { ...realKpis, ...demoPersonalKpis(demoPolicies, range) },
        goals: demoGoals(),
        recentWins: demoRecentWins(),
        analytics: {
          timeline: demoProductionTimeline(demoPolicies, range),
          carriers: demoCarrierAnalytics(demoPolicies, range),
          products: demoProductAnalytics(demoPolicies, range),
          statusAnalytics: demoPolicyStatusAnalytics(demoPolicies, range),
        },
        commissionsPaid: demoCommissionsPaidCard(demoPolicies, range, user.name, user.profileImageUrl),
      });
    }

    const [kpis, timeline, carriers, products, statusAnalytics, commissionsPaid, goals, recentWins] = await Promise.all([
      computePersonalKpis(userId, range),
      computeProductionTimeline(userId, range),
      computeCarrierAnalytics(userId, range),
      computeProductAnalytics(userId, range),
      computePolicyStatusAnalytics(userId, range),
      computeCommissionsPaidCard(userId, range),
      activeGoalsFor(userId),
      recentWinsFor(userId),
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
