"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { PremiumPanel } from "@/components/portal/dashboard/PremiumPanel";

type Item = { name: string; ap: number; count: number; avg: number };

const DONUT_COLORS = ["var(--color-copper)", "var(--color-teal-light)", "var(--color-blue-light)", "var(--color-green-light)", "var(--color-red-light)", "var(--color-copper-dim)"];

function currency(v: number) {
  return v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

/** Shared shape for Carrier Analytics and Product Analytics (spec: top item,
 * distribution donut, avg premium/case size per item — same layout for both). */
export function DistributionAnalytics({ title, avgLabel, items }: { title: string; avgLabel: string; items: Item[] }) {
  const top = items[0];

  return (
    <PremiumPanel className="p-5">
      <h3 className="font-condensed mb-1 text-base font-extrabold tracking-wide text-white uppercase">{title}</h3>
      {top ? (
        <p className="mb-3 text-xs text-muted">
          Top: <span className="text-white">{top.name}</span> ({currency(top.ap)})
        </p>
      ) : (
        <p className="mb-3 text-xs text-muted">No data yet.</p>
      )}
      <div className="flex items-center gap-4">
        <div className="h-40 w-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={items} dataKey="ap" nameKey="name" innerRadius={44} outerRadius={68} paddingAngle={2}>
                {items.map((entry, i) => (
                  <Cell key={entry.name} fill={DONUT_COLORS[i % DONUT_COLORS.length]} stroke="var(--color-surface)" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "var(--color-surface2)", border: "1px solid var(--color-border)", borderRadius: 8 }}
                formatter={(value: unknown, name: unknown): [string, string] => [currency(Number(value)), String(name)]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          {items.slice(0, 5).map((item, i) => (
            <div key={item.name} className="flex items-center justify-between gap-2 text-xs">
              <span className="flex min-w-0 items-center gap-1.5 truncate text-foreground">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                <span className="truncate">{item.name}</span>
              </span>
              <span className="shrink-0 text-muted">
                {item.count} · {currency(item.avg)} {avgLabel}
              </span>
            </div>
          ))}
          {items.length === 0 && <p className="text-xs text-muted">Nothing submitted in this window yet.</p>}
        </div>
      </div>
    </PremiumPanel>
  );
}
