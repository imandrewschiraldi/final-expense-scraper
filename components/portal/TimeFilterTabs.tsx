"use client";

import { useId } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { DATE_RANGES, DATE_RANGE_LABELS, DateRange } from "@/lib/dashboardMetricsShared";

export function TimeFilterTabs({ value, onChange }: { value: DateRange; onChange: (range: DateRange) => void }) {
  // Unique per mounted instance — a page can render more than one of these
  // (e.g. the Leaderboard's own filter plus the Team Dashboard's), and a
  // shared layoutId would make the pill fly between unrelated filter groups.
  const pillId = useId();

  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-border bg-surface p-1">
      {DATE_RANGES.map((range) => {
        const active = value === range;
        return (
          <button
            key={range}
            type="button"
            onClick={() => onChange(range)}
            className={cn(
              "font-condensed relative rounded-full px-3.5 py-1.5 text-[12px] font-bold tracking-[0.05em] uppercase transition-colors duration-200",
              active ? "text-black" : "text-muted hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId={pillId}
                className="absolute inset-0 rounded-full bg-copper"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <span className="relative">{DATE_RANGE_LABELS[range]}</span>
          </button>
        );
      })}
    </div>
  );
}
