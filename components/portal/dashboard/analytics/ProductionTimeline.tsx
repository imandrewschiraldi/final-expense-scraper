"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/cn";
import { PremiumPanel } from "@/components/portal/dashboard/PremiumPanel";
import { TimelineGranularity, TIMELINE_GRANULARITIES } from "@/lib/productionAnalyticsShared";

const GRANULARITY_LABELS: Record<TimelineGranularity, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

export function ProductionTimeline({
  data,
  granularity,
  onGranularityChange,
}: {
  data: { label: string; ap: number; count: number }[];
  granularity: TimelineGranularity;
  onGranularityChange: (g: TimelineGranularity) => void;
}) {
  return (
    <PremiumPanel className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-condensed text-base font-extrabold tracking-wide text-white uppercase">Production Timeline</h3>
        <div className="flex gap-1 rounded-lg border border-border p-0.5">
          {TIMELINE_GRANULARITIES.map((g) => (
            <button
              key={g}
              onClick={() => onGranularityChange(g)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                g === granularity ? "bg-copper text-black" : "text-muted hover:text-foreground",
              )}
            >
              {GRANULARITY_LABELS[g]}
            </button>
          ))}
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="timelineFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-copper)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--color-copper)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="label" stroke="var(--color-muted)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--color-muted)" fontSize={11} tickLine={false} axisLine={false} width={48} />
            <Tooltip
              cursor={{ stroke: "var(--color-copper-dim)", strokeWidth: 1 }}
              contentStyle={{ background: "var(--color-surface2)", border: "1px solid var(--color-border)", borderRadius: 8 }}
              formatter={(value: unknown, name: unknown): [string, string] =>
                name === "ap"
                  ? [Number(value).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }), "Annual Premium"]
                  : [String(value), "Policies"]
              }
            />
            <Area type="monotone" dataKey="ap" stroke="var(--color-copper)" strokeWidth={2.5} fill="url(#timelineFill)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </PremiumPanel>
  );
}
