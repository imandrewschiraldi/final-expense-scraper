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
    // The Dashboard's own Goals section always shows this viewer's real
    // goals, Demo Mode or not — unlike the Overview page's Goals widget
    // (served by /api/portal/goals), which does fake them. Fetched
    // unconditionally, before the demo-mode branch below, so both branches
    // return the same real goals/recentWins.
    const [goals, recentWins] = await Promise.all([activeGoalsFor(userId), recentWinsFor(userId)]);

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
      // AP-derived tiles are faked, layered on top.
      const realKpis = await computePersonalKpis(userId, range);
      return NextResponse.json({
        kpis: { ...realKpis, ...demoPersonalKpis(demoPolicies, range) },
        goals,
        recentWins,
        analytics: {
          timeline: demoProductionTimeline(demoPolicies, range),
          carriers: demoCarrierAnalytics(demoPolicies, range),
          products: demoProductAnalytics(demoPolicies, range),
          statusAnalytics: demoPolicyStatusAnalytics(demoPolicies, range),
        },
        commissionsPaid: demoCommissionsPaidCard(demoPolicies, range, user.name, user.profileImageUrl),
      });
    }

    const [kpis, timeline, carriers, products, statusAnalytics, commissionsPaid] = await Promise.all([
      computePersonalKpis(userId, range),
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
