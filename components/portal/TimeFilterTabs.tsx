"use client";

import { DATE_RANGES, DATE_RANGE_LABELS, DateRange } from "@/lib/dashboardMetricsShared";

export function TimeFilterTabs({ value, onChange }: { value: DateRange; onChange: (range: DateRange) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as DateRange)}
      className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-white focus:border-copper-dim focus:outline-none"
    >
      {DATE_RANGES.map((range) => (
        <option key={range} value={range}>
          {DATE_RANGE_LABELS[range]}
        </option>
      ))}
    </select>
  );
}
