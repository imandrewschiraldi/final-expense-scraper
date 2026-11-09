"use client";

import { useState } from "react";
import { format } from "date-fns";
import { KpiTrackerPanel } from "@/components/agent/KpiTrackerPanel";
import { KpiHistoryPanel } from "@/components/agent/KpiHistoryPanel";
import { PageHeading } from "@/components/portal/PageHeading";
import { cn } from "@/lib/cn";

type Tab = "tracker" | "history";

export function KpiTrackerClient() {
  const [tab, setTab] = useState<Tab>("tracker");

  return (
    <div>
      {/* PageHeading's own wrapper clears the desktop search box/icon
          cluster's absolutely-positioned 74px band on its own — its
          wordmark is horizontally centered, clear of both. Everything
          below it is safely past that band too. */}
      <PageHeading slug="kpi-tracker" alt="KPI Tracker" />

      <div className="mb-6 flex items-center justify-between gap-4 border-b border-border">
        <div className="flex items-center gap-6">
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
        <p className="pb-3 text-sm text-muted">
          {format(new Date(), "EEE, MMM d, yyyy")}
        </p>
      </div>

      {tab === "tracker" ? <KpiTrackerPanel /> : <KpiHistoryPanel />}
    </div>
  );
}
