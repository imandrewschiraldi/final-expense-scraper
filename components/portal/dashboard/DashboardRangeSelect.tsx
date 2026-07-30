"use client";

import { DASHBOARD_RANGES, DASHBOARD_RANGE_LABELS, DashboardRange } from "@/lib/dashboardRange";

export function DashboardRangeSelect({ value, onChange }: { value: DashboardRange; onChange: (range: DashboardRange) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as DashboardRange)}
      className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-white focus:border-copper-dim focus:outline-none"
    >
      {DASHBOARD_RANGES.map((r) => (
        <option key={r} value={r}>
          {DASHBOARD_RANGE_LABELS[r]}
        </option>
      ))}
    </select>
  );
}
