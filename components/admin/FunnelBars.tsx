"use client";

import { cn } from "@/lib/cn";
import { PremiumPanel } from "@/components/portal/dashboard/PremiumPanel";
import { metallicGradient } from "@/lib/metallic";

type FunnelRow = { id: string; label: string; count: number; color: string };

/** Horizontal bar breakdown for a funnel — same visual language as the
 *  agent Dashboard's StatusAnalytics panel, generalized to take an
 *  arbitrary ordered list of stages instead of a fixed policy-status set. */
export function FunnelBars({
  title,
  rows,
  conversion,
}: {
  title: string;
  rows: FunnelRow[];
  conversion?: { label: string; rate: number };
}) {
  const total = Math.max(...rows.map((r) => r.count), 1);

  return (
    <PremiumPanel className="p-5">
      <h3 className="font-condensed mb-3 text-base font-extrabold tracking-wide text-white uppercase">{title}</h3>

      {conversion && (
        <div className="mb-4 rounded-lg border border-border p-3">
          <p className="text-[11px] text-muted">{conversion.label}</p>
          <p className="text-xl font-bold text-white">{(conversion.rate * 100).toFixed(0)}%</p>
        </div>
      )}

      <div className="space-y-2">
        {rows.map((r) => {
          const percent = (r.count / total) * 100;
          return (
            <div key={r.id} className="flex items-center gap-3 text-xs">
              <span className="w-28 shrink-0 text-muted">{r.label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
                <div
                  className={cn("h-full rounded-full")}
                  style={{ width: `${Math.max(percent, r.count > 0 ? 2 : 0)}%`, backgroundImage: metallicGradient(r.color) }}
                />
              </div>
              <span className="w-10 shrink-0 text-right text-muted">{r.count}</span>
            </div>
          );
        })}
      </div>
    </PremiumPanel>
  );
}
