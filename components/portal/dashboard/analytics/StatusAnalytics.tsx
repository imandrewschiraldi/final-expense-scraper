"use client";

import { cn } from "@/lib/cn";
import { PremiumPanel } from "@/components/portal/dashboard/PremiumPanel";

type StatusBreakdown = { status: string; count: number; percent: number };

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: "bg-blue-light",
  PENDING: "bg-copper-dim",
  ISSUED: "bg-green-light",
  PLACED: "bg-teal-light",
  CANCELED: "bg-red-light",
  LAPSED: "bg-red-lighter",
  DECLINED: "bg-red",
  CHARGEBACK: "bg-red",
};

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: "Submitted",
  PENDING: "Pending",
  ISSUED: "Issued",
  PLACED: "Placed",
  CANCELED: "Canceled",
  LAPSED: "Lapsed",
  DECLINED: "Declined",
  CHARGEBACK: "Chargeback",
};

export function StatusAnalytics({
  breakdown,
  conversionRate,
  placementRate,
}: {
  breakdown: StatusBreakdown[];
  conversionRate: number;
  placementRate: number;
}) {
  return (
    <PremiumPanel className="p-5">
      <h3 className="font-condensed mb-3 text-base font-extrabold tracking-wide text-white uppercase">Policy Status Analytics</h3>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border p-3">
          <p className="text-[11px] text-muted">Conversion Rate</p>
          <p className="text-xl font-bold text-white">{(conversionRate * 100).toFixed(0)}%</p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-[11px] text-muted">Placement Rate</p>
          <p className="text-xl font-bold text-white">{(placementRate * 100).toFixed(0)}%</p>
        </div>
      </div>

      <div className="space-y-2">
        {breakdown.map((b) => (
          <div key={b.status} className="flex items-center gap-3 text-xs">
            <span className="w-20 shrink-0 text-muted">{STATUS_LABELS[b.status] ?? b.status}</span>
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
