"use client";

import { useState } from "react";
import { format } from "date-fns";
import { KpiTrackerPanel } from "@/components/agent/KpiTrackerPanel";
import { KpiHistoryPanel } from "@/components/agent/KpiHistoryPanel";
import { cn } from "@/lib/cn";

type Tab = "tracker" | "history";

export function KpiTrackerClient() {
  const [tab, setTab] = useState<Tab>("tracker");

  return (
    <div>
      {/* The desktop search box and icon cluster are absolutely positioned
          over the top 74px of `main` (HEADER_HEIGHT) — PageHeading's pages
          get away with sitting inside that band because their wordmark is
          horizontally centered, clear of the search box (left) and icon
          cluster (right) it would otherwise collide with. This title and
          date sit flush left/right instead — exactly where those two live
          — so they need real vertical clearance past the band instead,
          not just PageHeading's own (horizontally-safe) margin value.
          Below `lg` the desktop bar is hidden entirely (mobile gets its
          own in-flow PageHeader instead), so no extra margin is needed
          there. */}
      <div className="lg:mt-24">
        <h1 className="font-condensed text-2xl font-extrabold tracking-wide text-white uppercase">
          KPI Tracker
        </h1>
        <p className="mt-1 text-sm text-muted">
          Log daily activity and track pick-up, show, and close rates.
        </p>
        <p className="mt-2 text-sm text-muted">
          {format(new Date(), "EEE, MMM d, yyyy")}
        </p>
      </div>

      <div className="mt-6 mb-6 flex items-center gap-6 border-b border-border">
        {(
          [
            { id: "tracker", label: "My Tracker" },
            { id: "history", label: "My History" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "border-b-2 pb-3 text-sm font-semibold transition-colors",
              tab === t.id
                ? "border-copper text-white"
                : "border-transparent text-muted hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "tracker" ? <KpiTrackerPanel /> : <KpiHistoryPanel />}
    </div>
  );
}
