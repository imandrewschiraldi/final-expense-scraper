"use client";

import {
  KPI_SUMMARY_RANGES,
  KPI_SUMMARY_RANGE_LABELS,
  type KpiSummaryRange,
} from "@/lib/kpiTracker";

/** The Period summary card's period picker — five named windows plus an
 *  explicit custom range, each resolved to concrete "yyyy-MM-dd" bounds by
 *  the caller (kpiSummaryRangeBounds in lib/kpiTracker.ts) rather than
 *  here, so this component stays a plain controlled picker. */
export function KpiRangeSelect({
  value,
  onChange,
  customFrom,
  customTo,
  onCustomChange,
}: {
  value: KpiSummaryRange;
  onChange: (range: KpiSummaryRange) => void;
  customFrom: string;
  customTo: string;
  onCustomChange: (from: string, to: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as KpiSummaryRange)}
        className="rounded-lg border-copper-focus-gradient bg-surface px-3 py-1.5 text-sm font-semibold text-white focus:outline-none"
      >
        {KPI_SUMMARY_RANGES.map((r) => (
          <option key={r} value={r}>
            {KPI_SUMMARY_RANGE_LABELS[r]}
          </option>
        ))}
      </select>
      {value === "custom" && (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={customFrom}
            max={customTo}
            onChange={(e) => onCustomChange(e.target.value, customTo)}
            className="rounded-lg border border-copper-focus-gradient bg-surface px-2 py-1.5 text-xs text-foreground focus:outline-none"
          />
          <span className="text-xs text-muted">to</span>
          <input
            type="date"
            value={customTo}
            min={customFrom}
            onChange={(e) => onCustomChange(customFrom, e.target.value)}
            className="rounded-lg border border-copper-focus-gradient bg-surface px-2 py-1.5 text-xs text-foreground focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}
