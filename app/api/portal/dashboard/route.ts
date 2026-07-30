import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/apiAuth";
import { getDashboardLayout } from "@/lib/dashboardLayout";
import {
  DATE_RANGES,
  DateRange,
  computeMetrics,
  computePreviousMetrics,
  computeDailyBreakdown,
  computeAgentBreakdown,
} from "@/lib/dashboardMetrics";

export async function GET(req: NextRequest) {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  const { searchParams } = new URL(req.url);
  const scopeParam = searchParams.get("scope") === "team" ? "team" : "personal";
  const rangeParam = searchParams.get("range");
  const range: DateRange = DATE_RANGES.includes(rangeParam as DateRange) ? (rangeParam as DateRange) : "mtd";

  const scope = scopeParam === "personal" ? { agentId: guard.session.user.id } : {};

  const widgets = await getDashboardLayout();

  const data: Record<string, { value?: number; previousValue?: number; series?: { label: string; value: number }[] }> = {};

  const hasMetricWidget = widgets.some((w) => w.type === "METRIC");
  const [metrics, previousMetrics] = hasMetricWidget
    ? await Promise.all([computeMetrics(scope, range), computePreviousMetrics(scope, range)])
    : [null, null];

  await Promise.all(
    widgets.map(async (widget) => {
      if (widget.type === "METRIC") {
        data[widget.id] = { value: metrics![widget.metric], previousValue: previousMetrics![widget.metric] };
      } else {
        const series =
          scopeParam === "personal"
            ? await computeDailyBreakdown(scope, widget.metric, range)
            : await computeAgentBreakdown(widget.metric, range);
        data[widget.id] = { series };
      }
    }),
  );

  return NextResponse.json({ widgets, data, scope: scopeParam, range });
}
