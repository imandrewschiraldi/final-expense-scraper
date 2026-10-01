"use client";

import { useId } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { PremiumPanel } from "@/components/portal/dashboard/PremiumPanel";

type Item = { name: string; ap: number; count: number; avg: number };

// The donut's rotating categorical palette — purely for telling slices
// apart, no brand/status meaning of its own, so each color gets its own
// metallic hi/dk pair (see app/globals.css) rather than reusing a status
// color. `flat` is kept only for the legend dot's CSS gradient fallback
// order; the wedges themselves use the SVG <linearGradient> defs below.
const DONUT_SWATCHES = [
  { base: "var(--color-copper)", hi: "var(--copper-metal-hi)", dk: "var(--copper-metal-dk)" },
  { base: "var(--color-teal-light)", hi: "var(--teal-light-metal-hi)", dk: "var(--teal-light-metal-dk)" },
  { base: "var(--color-blue-light)", hi: "var(--blue-light-metal-hi)", dk: "var(--blue-light-metal-dk)" },
  { base: "var(--color-green-light)", hi: "var(--green-light-metal-hi)", dk: "var(--green-light-metal-dk)" },
  { base: "var(--color-red-light)", hi: "var(--red-light-metal-hi)", dk: "var(--red-light-metal-dk)" },
  { base: "var(--color-copper-dim)", hi: "var(--copper-dim-metal-hi)", dk: "var(--copper-dim-metal-dk)" },
];

function legendGradient(swatch: (typeof DONUT_SWATCHES)[number]) {
  return `linear-gradient(135deg, ${swatch.hi} 0%, ${swatch.base} 30%, ${swatch.dk} 55%, ${swatch.base} 80%, ${swatch.hi} 100%)`;
}

function currency(v: number) {
  return v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

/** Shared shape for Carrier Analytics and Product Analytics (spec: top item,
 * distribution donut, avg premium/case size per item — same layout for both).
 * Item order is caller-controlled (Carrier Analytics sorts by volume, Product
 * Analytics keeps the fixed product list order); "top" is found by value
 * regardless of list order. */
export function DistributionAnalytics({ title, avgLabel, items }: { title: string; avgLabel: string; items: Item[] }) {
  // Unique per component instance (this panel renders twice on one page —
  // Carrier Analytics + Product Analytics) so the two charts' <defs> don't
  // collide on the same gradient ids.
  const gradientIdBase = useId().replace(/:/g, "");
  const gradientId = (i: number) => `${gradientIdBase}-donut-${i}`;

  const totalAp = items.reduce((sum, i) => sum + i.ap, 0);
  const top = items.reduce<Item | null>((max, i) => (max === null || i.ap > max.ap ? i : max), null);

  return (
    <PremiumPanel className="p-5">
      <h3 className="font-condensed mb-1 text-base font-extrabold tracking-wide text-white uppercase">{title}</h3>
      {top && top.ap > 0 ? (
        <p className="mb-3 text-xs text-muted">
          Top: <span className="text-white">{top.name}</span> ({currency(top.ap)})
        </p>
      ) : (
        <p className="mb-3 text-xs text-muted">No data yet.</p>
      )}
      <div className="flex items-center gap-4">
        <div className="h-40 w-40 shrink-0">
          {totalAp > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <defs>
                  {DONUT_SWATCHES.map((swatch, i) => (
                    <linearGradient key={i} id={gradientId(i)} x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor={swatch.hi} />
                      <stop offset="30%" stopColor={swatch.base} />
                      <stop offset="55%" stopColor={swatch.dk} />
                      <stop offset="80%" stopColor={swatch.base} />
                      <stop offset="100%" stopColor={swatch.hi} />
                    </linearGradient>
                  ))}
                </defs>
                <Pie data={items} dataKey="ap" nameKey="name" innerRadius={44} outerRadius={68} paddingAngle={2}>
                  {items.map((entry, i) => (
                    <Cell key={entry.name} fill={`url(#${gradientId(i % DONUT_SWATCHES.length)})`} stroke="var(--color-surface)" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "var(--color-surface2)", border: "1px solid var(--color-border)", borderRadius: 8 }}
                  formatter={(value: unknown, name: unknown): [string, string] => [currency(Number(value)), String(name)]}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-full border border-dashed border-border text-[11px] text-muted">
              No data
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          {items.slice(0, 6).map((item, i) => (
            <div key={item.name} className="flex items-center justify-between gap-2 text-xs">
              <span className="flex min-w-0 items-center gap-1.5 truncate text-foreground">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundImage: legendGradient(DONUT_SWATCHES[i % DONUT_SWATCHES.length]) }}
                />
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
