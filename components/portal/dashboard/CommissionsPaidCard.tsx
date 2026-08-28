"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { useCountUp } from "@/lib/useCountUp";
import { CommissionsPaidCardData } from "@/lib/personalDashboardShared";
import { DashboardRange } from "@/lib/dashboardRange";

const RANGE_PILL_LABEL: Record<DashboardRange, string> = {
  daily: "Today",
  weekly: "This Week",
  monthly: "This Month",
  ytd: "This Year",
  all: "All Time",
};

const RANGE_DELTA_LABEL: Record<DashboardRange, string> = {
  daily: "vs yesterday",
  weekly: "vs last week",
  monthly: "vs last month",
  ytd: "vs last year",
  all: "",
};

const currency = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/**
 * The dashboard's hero stat — deliberately its own card, not a KpiGrid
 * tile, since it's meant to be photogenic enough to screenshot on its own.
 * The number's gradient is sampled directly from public/headings/dashboard.png
 * (the page's own graphic heading) rather than invented, so it reads as the
 * exact same copper the rest of the app already uses.
 */
export function CommissionsPaidCard({ data, range }: { data: CommissionsPaidCardData; range: DashboardRange }) {
  const animated = useCountUp(data.value);
  const delta = data.value - data.previousValue;
  const showDelta = range !== "all" && data.previousValue > 0;
  const isUp = delta >= 0;
  const DeltaIcon = isUp ? ArrowUpRight : ArrowDownRight;

  return (
    <div
      className="relative mb-5 overflow-hidden rounded-[20px] border border-copper/30 p-[18px_28px]"
      style={{
        background:
          "radial-gradient(130% 160% at 100% 0%, rgba(200,121,65,.20), transparent 60%), linear-gradient(160deg,#0d0d0d 0%,#080808 60%,#000 100%)",
        boxShadow:
          "0 0 0 1px rgba(200,121,65,.06) inset, 0 30px 80px -30px rgba(200,121,65,.3), 0 24px 48px -28px rgba(0,0,0,.8)",
      }}
    >
      <div className="mb-2.5 flex items-center justify-end">
        <span className="rounded-full border border-white/[0.12] px-3 py-[5px] text-[11px] font-bold tracking-[0.08em] text-muted uppercase">
          {RANGE_PILL_LABEL[range]}
        </span>
      </div>

      <p className="font-condensed mb-1.5 text-xs font-extrabold tracking-[0.22em] text-copper uppercase">
        Commissions Paid
      </p>
      <p
        className="font-scoreboard text-[68px] leading-none font-black tracking-tight"
        style={{
          background: "linear-gradient(90deg, #d88a4a 0%, #c37135 45%, #994022 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          filter: "drop-shadow(0 2px 0 rgba(0,0,0,.45)) drop-shadow(0 0 48px rgba(200,121,65,.55))",
        }}
      >
        {currency(animated ?? data.value)}
      </p>

      <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3">
        {showDelta ? (
          <span
            className={`font-condensed flex items-center gap-1 text-[13px] font-extrabold tracking-[0.04em] uppercase ${
              isUp ? "text-green-light" : "text-red-light"
            }`}
          >
            <DeltaIcon className="h-3.5 w-3.5" />
            {isUp ? "+" : "-"}
            {currency(Math.abs(delta))} {RANGE_DELTA_LABEL[range]}
          </span>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          {data.agentProfileImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.agentProfileImageUrl} alt="" className="h-[22px] w-[22px] rounded-full object-cover" />
          ) : (
            <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-surface2 text-[11px] font-bold text-muted">
              {data.agentName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-xs font-bold text-foreground">{data.agentName}</span>
        </div>
      </div>
    </div>
  );
}
