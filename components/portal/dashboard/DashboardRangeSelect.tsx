"use client";

import { DASHBOARD_RANGES, DASHBOARD_RANGE_LABELS, DashboardRange } from "@/lib/dashboardRange";

export function DashboardRangeSelect({ value, onChange }: { value: DashboardRange; onChange: (range: DashboardRange) => void }) {
  return (
    <select
      data-tour="dashboard-range-select"
      value={value}
      onChange={(e) => onChange(e.target.value as DashboardRange)}
      className="rounded-lg border-copper-focus-gradient bg-surface px-3 py-1.5 text-sm font-semibold text-white focus:outline-none"
    >
      {DASHBOARD_RANGES.map((r) => (
        <option key={r} value={r}>
          {DASHBOARD_RANGE_LABELS[r]}
        </option>
      ))}
    </select>
  );
}
