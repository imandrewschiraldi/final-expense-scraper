"use client";

import { cn } from "@/lib/cn";
import { PremiumPanel } from "@/components/portal/dashboard/PremiumPanel";

type StatusBreakdown = { status: string; count: number; percent: number };

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: "bg-blue-light",
  ISSUED: "bg-green-light",
  CHARGEBACK: "bg-red-light",
};

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: "Submitted",
  ISSUED: "Issued",
  CHARGEBACK: "Chargeback",
};

export function StatusAnalytics({
  breakdown,
  conversionRate,
}: {
  breakdown: StatusBreakdown[];
  conversionRate: number;
}) {
  return (
    <PremiumPanel className="p-5">
      <h3 className="font-condensed mb-3 text-base font-extrabold tracking-wide text-white uppercase">Policy Status Analytics</h3>

      <div className="mb-4 rounded-lg border border-border p-3">
        <p className="text-[11px] text-muted">Conversion Rate (Submitted → Issued)</p>
        <p className="text-xl font-bold text-white">{(conversionRate * 100).toFixed(0)}%</p>
      </div>

      <div className="space-y-2">
        {breakdown.map((b) => (
          <div key={b.status} className="flex items-center gap-3 text-xs">
            <span className="w-24 shrink-0 text-muted">{STATUS_LABELS[b.status] ?? b.status}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
              <div
                className={cn("h-full rounded-full", STATUS_COLORS[b.status] ?? "bg-copper")}
                style={{ width: `${Math.max(b.percent, b.count > 0 ? 2 : 0)}%` }}
              />
            </div>
            <span className="w-16 shrink-0 text-right text-muted">
              {b.count} · {b.percent.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </PremiumPanel>
  );
}
