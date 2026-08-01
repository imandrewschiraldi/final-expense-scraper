import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { format } from "date-fns";
import { requireAnyRole } from "@/lib/apiAuth";
import { computeCarrierAnalytics, computeProductAnalytics } from "@/lib/productionAnalytics";
import { DASHBOARD_RANGES, DASHBOARD_RANGE_LABELS, DashboardRange } from "@/lib/dashboardRange";

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

  const rows = [
    ...carriers.map((c) => ({
      Section: "Carrier",
      Name: c.carrier,
      Policies: c.count,
      "Annual Premium": c.ap.toFixed(2),
      "Avg Premium": c.avgPremium.toFixed(2),
    })),
    ...products.map((p) => ({
      Section: "Product",
      Name: p.product,
      Policies: p.count,
      "Annual Premium": p.ap.toFixed(2),
      "Avg Premium": p.avgCaseSize.toFixed(2),
    })),
  ];

  const csv = Papa.unparse(rows);
  const filename = `production-report-${scope}-${DASHBOARD_RANGE_LABELS[range].toLowerCase()}-${format(new Date(), "yyyy-MM-dd")}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
