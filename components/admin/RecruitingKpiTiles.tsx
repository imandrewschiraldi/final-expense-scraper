"use client";

import { motion } from "motion/react";
import { ArrowUpRight, ArrowDownRight, LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { PremiumPanel } from "@/components/portal/dashboard/PremiumPanel";
import { useCountUp } from "@/lib/useCountUp";

export type RecruitingKpiEntry = {
  key: string;
  label: string;
  value: number;
  /** Only set for time-windowed tiles (activity, not a live total) — drives the up/down delta badge. */
  previousValue?: number;
  icon: LucideIcon;
  onClick: () => void;
  active: boolean;
  /** Small line under the big number — e.g. "8 currently" when the tile's
   *  headline number is a time-windowed activity count rather than a live
   *  total, so clicking through to "everyone currently in this stage"
   *  doesn't feel disconnected from what's on screen. */
  caption?: string;
};

function DeltaBadge({ value, previousValue }: { value: number; previousValue: number | undefined }) {
  if (previousValue === undefined || previousValue === 0) return null;
  const change = ((value - previousValue) / previousValue) * 100;
  if (!Number.isFinite(change) || Math.round(change) === 0) return null;
  const isUp = change > 0;
  const Icon = isUp ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("flex items-center gap-0.5 text-xs font-semibold", isUp ? "text-green-light" : "text-red-light")}>
      <Icon className="h-3.5 w-3.5" />
      {Math.abs(change).toFixed(0)}%
    </span>
  );
}

function KpiTile({ index, entry }: { index: number; entry: RecruitingKpiEntry }) {
  const animated = useCountUp(entry.value);
  const Icon = entry.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.035, 0.35), ease: "easeOut" }}
      whileHover={{ y: -2 }}
    >
      <button type="button" onClick={entry.onClick} className="block w-full text-left">
        <PremiumPanel
          className={cn(
            "h-full p-4 transition-colors duration-200",
            entry.active ? "border-copper" : "hover:border-copper-dim",
          )}
        >
          <div className="flex items-center justify-between">
            <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", entry.active ? "bg-copper/20" : "bg-copper/10")}>
              <Icon className="h-4.5 w-4.5 text-copper" />
            </div>
            <DeltaBadge value={entry.value} previousValue={entry.previousValue} />
          </div>
          <p className="mt-3 truncate text-[13px] text-muted">{entry.label}</p>
          <p className="mt-0.5 text-[26px] leading-tight font-bold text-white">
            {Math.round(animated ?? entry.value).toLocaleString("en-US")}
          </p>
          {entry.caption && <p className="mt-0.5 text-[11px] text-muted/70">{entry.caption}</p>}
        </PremiumPanel>
      </button>
    </motion.div>
  );
}

/** Grid of animated KPI tiles for the Recruiting Radar dashboard — same
 *  visual language as the agent Dashboard's KpiGrid (PremiumPanel shell,
 *  count-up numbers, delta badges), but each tile also doubles as a filter
 *  button for the prospect table below, so it takes onClick/active per
 *  entry rather than a fixed key list. */
export function RecruitingKpiTiles({ entries }: { entries: RecruitingKpiEntry[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {entries.map((entry, index) => (
        <KpiTile key={entry.key} index={index} entry={entry} />
      ))}
    </div>
  );
}
