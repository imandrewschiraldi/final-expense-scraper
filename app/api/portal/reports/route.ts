import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/apiAuth";
import { computeCarrierAnalytics, computeProductAnalytics } from "@/lib/productionAnalytics";
import { DASHBOARD_RANGES, DashboardRange } from "@/lib/dashboardRange";

export async function GET(req: NextRequest) {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") === "org" ? "org" : "personal";
  const rangeParam = searchParams.get("range");
  const range: DashboardRange = (DASHBOARD_RANGES as readonly string[]).includes(rangeParam ?? "")
    ? (rangeParam as DashboardRange)
    : "monthly";

  const agentId = scope === "org" ? null : guard.session.user.id;

  const [carriers, products] = await Promise.all([
    computeCarrierAnalytics(agentId, range),
    computeProductAnalytics(agentId, range),
  ]);

  return NextResponse.json({ carriers, products });
}
