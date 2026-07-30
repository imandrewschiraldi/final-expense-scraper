"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { PremiumPanel } from "@/components/portal/dashboard/PremiumPanel";

export function ProductionTimeline({ data }: { data: { label: string; ap: number; count: number }[] }) {
  return (
    <PremiumPanel className="p-5">
      <h3 className="font-condensed mb-3 text-base font-extrabold tracking-wide text-white uppercase">Production Timeline</h3>
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
