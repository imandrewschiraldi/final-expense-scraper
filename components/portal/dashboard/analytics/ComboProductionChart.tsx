"use client";

import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { PremiumPanel } from "@/components/portal/dashboard/PremiumPanel";

type Point = { label: string; ap: number; count: number; avgCaseSize: number };

/** Shared chart shape for the Rolling 8-Week and 12-Month Trend sections —
 * annual premium as bars, average case size as an overlaid line. */
export function ComboProductionChart({ title, data }: { title: string; data: Point[] }) {
  return (
    <PremiumPanel className="p-5">
      <h3 className="font-condensed mb-3 text-base font-extrabold tracking-wide text-white uppercase">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="label" stroke="var(--color-muted)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis yAxisId="ap" stroke="var(--color-muted)" fontSize={11} tickLine={false} axisLine={false} width={48} />
            <YAxis yAxisId="avg" orientation="right" stroke="var(--color-muted)" fontSize={11} tickLine={false} axisLine={false} width={48} />
            <Tooltip
              cursor={{ fill: "var(--color-copper-glow)" }}
              contentStyle={{ background: "var(--color-surface2)", border: "1px solid var(--color-border)", borderRadius: 8 }}
              formatter={(value: unknown, name: unknown): [string, string] => {
                const num = Number(value);
                if (name === "ap") return [num.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }), "Annual Premium"];
                if (name === "avgCaseSize") return [num.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }), "Avg Case Size"];
                return [String(value), "Policies"];
              }}
            />
            <Bar yAxisId="ap" dataKey="ap" fill="var(--color-copper)" radius={[6, 6, 0, 0]} maxBarSize={32} />
            <Line yAxisId="avg" type="monotone" dataKey="avgCaseSize" stroke="var(--color-teal-light)" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </PremiumPanel>
  );
}
