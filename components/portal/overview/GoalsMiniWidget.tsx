"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarRange, LineChart, Receipt, Target, UserPlus, Wallet, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { GoalWithProgress } from "@/lib/personalDashboardShared";
import { GOAL_CATEGORY_LABELS, GOAL_CATEGORY_FORMAT } from "@/lib/personalDashboardShared";

const GOAL_CATEGORY_ICONS: Record<string, LucideIcon> = {
  MONTHLY_AP: LineChart,
  ANNUAL_AP: CalendarRange,
  ISSUED_PREMIUM: Receipt,
  POLICY_COUNT: Target,
  INCOME: Wallet,
  RECRUITING: UserPlus,
};

function formatGoalValue(category: string, value: number) {
  const fmt = GOAL_CATEGORY_FORMAT[category] ?? "currency";
  if (fmt === "currency") {
    return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  }
  return Math.round(value).toLocaleString("en-US");
}

const MAX_SHOWN = 3;

/** Compact Overview-grid version of the Dashboard's full Goals section —
 *  a slim progress bar per active goal rather than the big ring (no room
 *  for it in a tile this size), capped at a few goals with a link to the
 *  full list rather than trying to fit them all. Self-fetches the same
 *  /api/portal/goals endpoint the Dashboard page's own Goals section uses,
 *  same pattern as this grid's other self-contained widgets (Recruiting
 *  Radar, Mini Leaderboard). */
export function GoalsMiniWidget() {
  const [goals, setGoals] = useState<GoalWithProgress[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/portal/goals")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && !cancelled && setGoals(data.active))
      .catch(() => !cancelled && setGoals([]));
    return () => {
      cancelled = true;
    };
  }, []);

  const shown = goals?.slice(0, MAX_SHOWN) ?? [];

  return (
    <Card data-tour="goals-widget" className="flex h-full flex-col p-5">
      <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <Target className="h-[18px] w-[18px]" style={{ color: "var(--copper-metal-hi)" }} />
          <h3 className="font-condensed text-[15.5px] font-extrabold tracking-wide text-white uppercase">Goals</h3>
        </div>
        <Link href="/dashboard#goals" className="font-condensed text-[11px] font-bold tracking-wide text-teal-light uppercase hover:underline">
          View All
        </Link>
      </div>

      {!goals ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : shown.length === 0 ? (
        <p className="text-sm text-muted">No active goals yet. Set one from the Dashboard to start tracking your pace.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {shown.map((goal) => {
            const Icon = GOAL_CATEGORY_ICONS[goal.category] ?? Target;
            const complete = goal.percent >= 100;
            const pct = Math.min(100, Math.max(0, goal.percent));
            return (
              <div key={goal.id}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--copper-metal-hi)" }} />
                    <span className="truncate text-[13px] font-semibold text-foreground">
                      {GOAL_CATEGORY_LABELS[goal.category] ?? goal.category}
                    </span>
                  </div>
                  <span className="font-condensed shrink-0 text-[11px] font-bold tracking-wide text-muted">
                    {complete ? "DONE" : `${pct.toFixed(0)}%`}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface2">
                  <div
                    className="h-full rounded-full transition-[width] duration-700"
                    style={{
                      width: `${pct}%`,
                      background: complete
                        ? "linear-gradient(90deg, var(--green-metal-dk), var(--green-metal-hi))"
                        : "linear-gradient(90deg, var(--copper-metal-dk), var(--copper-metal-hi))",
                    }}
                  />
                </div>
                {!complete && (
                  <p className="mt-1 text-[11px] text-muted">
                    {formatGoalValue(goal.category, goal.remaining)} remaining of {formatGoalValue(goal.category, goal.targetValue)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
