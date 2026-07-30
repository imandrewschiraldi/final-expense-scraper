"use client";

import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/cn";
import { PremiumPanel } from "@/components/portal/dashboard/PremiumPanel";
import { RecentActivityItem } from "@/lib/agencyDashboardShared";

const STATUS_COLOR: Record<string, string> = {
  SUBMITTED: "text-blue-light",
  ISSUED: "text-green-light",
  CHARGEBACK: "text-red-light",
};

export function RecentActivity({ items }: { items: RecentActivityItem[] }) {
  return (
    <PremiumPanel className="p-5">
      <h3 className="font-condensed mb-3 text-base font-extrabold tracking-wide text-white uppercase">Recent Activity</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted">Your organization analytics will populate as agents submit business.</p>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate text-white">
                  {item.agentName ?? "Unknown"} <span className="text-muted">submitted</span> {item.carrier}
                  {item.product ? ` · ${item.product}` : ""}
                </p>
                <p className="text-xs text-muted">{formatDistanceToNow(new Date(item.submittedAt), { addSuffix: true })}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-semibold text-white">
                  {item.annualPremium.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
                </p>
                <p className={cn("text-xs", STATUS_COLOR[item.status] ?? "text-muted")}>{item.status}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </PremiumPanel>
  );
}
