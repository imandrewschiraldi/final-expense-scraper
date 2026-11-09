import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { getTeamKpiSummary } from "@/lib/kpiTrackerServer";
import { DASHBOARD_RANGES, type DashboardRange } from "@/lib/dashboardRange";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const rangeParam = req.nextUrl.searchParams.get("range") ?? "weekly";
  if (!DASHBOARD_RANGES.includes(rangeParam as DashboardRange)) {
    return NextResponse.json({ error: "Invalid range." }, { status: 400 });
  }

  const agents = await getTeamKpiSummary(rangeParam as DashboardRange);
  return NextResponse.json({ agents });
}
