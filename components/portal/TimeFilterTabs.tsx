"use client";

import { cn } from "@/lib/cn";
import { DATE_RANGES, DATE_RANGE_LABELS, DateRange } from "@/lib/dashboardMetricsShared";

export function TimeFilterTabs({ value, onChange }: { value: DateRange; onChange: (range: DateRange) => void }) {
  return (
    <div className="flex gap-2">
      {DATE_RANGES.map((range) => (
        <button
          key={range}
          type="button"
          onClick={() => onChange(range)}
          className={cn(
            "font-condensed rounded-lg border-[1.5px] px-3 py-1.5 text-[12px] font-bold tracking-[0.05em] uppercase transition-colors",
            value === range
              ? "border-copper bg-copper text-black"
              : "border-copper-dim text-muted hover:border-copper hover:text-foreground",
          )}
        >
          {DATE_RANGE_LABELS[range]}
        </button>
      ))}
    </div>
  );
}
