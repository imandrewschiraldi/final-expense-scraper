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
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-condensed text-2xl font-extrabold tracking-wide text-white uppercase">
            KPI Tracker
          </h1>
          <p className="mt-1 text-sm text-muted">
            Log daily activity and track pick-up, show, and close rates.
          </p>
        </div>
        <p className="text-sm text-muted">
          {format(new Date(), "EEE, MMM d, yyyy")}
        </p>
      </div>

      <div className="mb-6 flex items-center gap-6 border-b border-border">
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
