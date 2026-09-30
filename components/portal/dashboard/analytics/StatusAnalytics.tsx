"use client";

import { PremiumPanel } from "@/components/portal/dashboard/PremiumPanel";
import { metallicGradient } from "@/lib/metallic";

type StatusBreakdown = { status: string; count: number; percent: number };

// Issued/Chargeback reuse the exact green/red the success/danger buttons
// use elsewhere; Submitted has no button equivalent so it sits on the
// same blue tuned for Interviewed in the Job Applications funnel.
const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: "#3a70a9",
  ISSUED: "#27ae60",
  CHARGEBACK: "#c0392b",
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
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(b.percent, b.count > 0 ? 2 : 0)}%`,
                  backgroundImage: metallicGradient(STATUS_COLORS[b.status] ?? "#a85a28"),
                }}
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
