"use client";

import { Wallet, FileCheck2, FileX2, FileText, DollarSign, Users, ArrowUpRight, ArrowDownRight, LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { AGENCY_KPI_META, AgencyKpiKey, AgencyKpiData, formatKpiValue } from "@/lib/agencyDashboardShared";

const METRIC_ICONS: Record<AgencyKpiKey, LucideIcon> = {
  totalAnnualPremium: Wallet,
  totalIssuedPremium: FileCheck2,
  totalChargebackPremium: FileX2,
  totalPoliciesSubmitted: FileText,
  avgCaseSize: DollarSign,
  activeAgents: Users,
};

function DeltaBadge({ value, previousValue }: { value: number | undefined; previousValue: number | undefined }) {
  if (value === undefined || previousValue === undefined || previousValue === 0) return null;
  const change = ((value - previousValue) / previousValue) * 100;
  if (!Number.isFinite(change) || Math.round(change) === 0) return null;
  const isUp = change > 0;
  const Icon = isUp ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`flex items-center gap-0.5 text-xs font-semibold ${isUp ? "text-green-light" : "text-red-light"}`}>
      <Icon className="h-3.5 w-3.5" />
      {Math.abs(change).toFixed(0)}%
    </span>
  );
}

/** One agency-wide metric tile, same visual language as the other Overview
 *  widget cards — the value itself reuses the exact definition the Agency
 *  Dashboard's own KPI grid computes, just over a fixed "this month" window
 *  rather than a user-chosen range. */
export function MetricTile({ metricKey, data }: { metricKey: AgencyKpiKey; data: AgencyKpiData }) {
  const meta = AGENCY_KPI_META[metricKey];
  const entry = data[metricKey];
  const Icon = METRIC_ICONS[metricKey];

  return (
    <Card className="p-5" title={meta.explain}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-[18px] w-[18px]" style={{ color: "var(--copper-metal-hi)" }} />
          <h3 className="font-condensed text-[15.5px] font-extrabold tracking-wide text-white uppercase">{meta.label}</h3>
        </div>
        <DeltaBadge value={entry?.value} previousValue={entry?.previousValue} />
      </div>
      <p className="text-[28px] leading-tight font-bold text-white">{formatKpiValue(metricKey, entry?.value)}</p>
      <p className="mt-1 text-xs text-muted">This month vs. last month</p>
    </Card>
  );
}
