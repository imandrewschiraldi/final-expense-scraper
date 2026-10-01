"use client";

import { useState } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { useCountUp } from "@/lib/useCountUp";
import { CommissionsPaidCardData } from "@/lib/personalDashboardShared";
import { DashboardRange } from "@/lib/dashboardRange";
import { COMMISSION_ADVANCE_RATE } from "@/lib/commission";

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
 * The number uses the shared .metal-copper-text gradient (app/globals.css,
 * sampled from the real logo) so it reads as the exact same copper the
 * rest of the app uses.
 */
export function CommissionsPaidCard({ data, range }: { data: CommissionsPaidCardData; range: DashboardRange }) {
  // Off by default: the headline number is the full commission the
  // business written is worth. Toggling Advance shows what's actually
  // been advanced so far — the same figure × the 9-month advance rate.
  const [showAdvance, setShowAdvance] = useState(false);
  const multiplier = showAdvance ? COMMISSION_ADVANCE_RATE : 1;
  const value = data.value * multiplier;
  const previousValue = data.previousValue * multiplier;
  const animated = useCountUp(value);
  const delta = value - previousValue;
  const showDelta = range !== "all" && previousValue > 0;
  const isUp = delta >= 0;
  const DeltaIcon = isUp ? ArrowUpRight : ArrowDownRight;

  return (
    <div
      className="relative mb-5 overflow-hidden rounded-[20px] border border-copper/30 p-[18px_28px]"
      style={{
        background:
          "radial-gradient(130% 160% at 100% 0%, rgba(168,90,40,.20), transparent 60%), linear-gradient(160deg,#0d0d0d 0%,#080808 60%,#000 100%)",
        boxShadow:
          "0 0 0 1px rgba(168,90,40,.06) inset, 0 30px 80px -30px rgba(168,90,40,.3), 0 24px 48px -28px rgba(0,0,0,.8)",
      }}
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setShowAdvance((s) => !s)}
          aria-pressed={showAdvance}
          className={`rounded-full border px-3 py-[5px] text-[11px] font-bold tracking-[0.08em] uppercase transition-colors ${
            showAdvance ? "toggle-pill-active" : "border-white/[0.12] text-muted hover:text-foreground"
          }`}
        >
          Advance
        </button>
        <span className="rounded-full border border-white/[0.12] px-3 py-[5px] text-[11px] font-bold tracking-[0.08em] text-muted uppercase">
          {RANGE_PILL_LABEL[range]}
        </span>
      </div>

      <p className="metal-copper-text font-condensed mb-1.5 text-base font-extrabold tracking-[0.18em] uppercase">
        Commissions Paid{showAdvance ? " · 75% Advance" : ""}
      </p>
      <p
        className="metal-copper-text font-scoreboard text-[68px] leading-none font-black tracking-tight"
        style={{
          filter: "drop-shadow(0 2px 0 rgba(0,0,0,.45)) drop-shadow(0 0 48px rgba(168,90,40,.55))",
        }}
      >
        {currency(animated ?? value)}
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
