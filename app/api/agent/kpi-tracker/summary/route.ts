import { NextRequest, NextResponse } from "next/server";
import { requireAgent } from "@/lib/apiAuth";
import { getPeriodSummary } from "@/lib/kpiTrackerServer";
import { DASHBOARD_RANGES, type DashboardRange } from "@/lib/dashboardRange";

export async function GET(req: NextRequest) {
  const guard = await requireAgent();
  if ("error" in guard) return guard.error;

  const rangeParam = req.nextUrl.searchParams.get("range") ?? "weekly";
  if (!DASHBOARD_RANGES.includes(rangeParam as DashboardRange)) {
    return NextResponse.json({ error: "Invalid range." }, { status: 400 });
  }

  const summary = await getPeriodSummary(
    guard.session.user.id,
    rangeParam as DashboardRange,
  );
  return NextResponse.json({ summary });
}
