"use client";

import { Fragment, useEffect, useState } from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/formatMoney";
import { parseKpiDate, type KpiWeekTotals } from "@/lib/kpiTracker";
import { cn } from "@/lib/cn";

const COLUMNS: { key: string; label: string }[] = [
  { key: "dials", label: "Dials" },
  { key: "answered", label: "Answered" },
  { key: "apptsShown", label: "Appts. shown" },
  { key: "presentations", label: "Pres." },
  { key: "dealsClosed", label: "Closed" },
  { key: "apSubmitted", label: "AP submitted" },
  { key: "deposits", label: "Deposits" },
  { key: "leadSpend", label: "Lead spend" },
  { key: "hoursWorked", label: "Hours" },
  { key: "apptsScheduled", label: "Appts. scheduled" },
  { key: "pickupRate", label: "Pick-up" },
  { key: "showRate", label: "Show" },
  { key: "closeRate", label: "Close" },
];

function formatWeekRange(weekStart: string, weekEnd: string): string {
  const start = parseKpiDate(weekStart);
  const end = parseKpiDate(weekEnd);
  const sameMonth = format(start, "MMM") === format(end, "MMM");
  return `Week of ${format(start, sameMonth ? "MMM d" : "MMM d")} – ${format(end, sameMonth ? "d, yyyy" : "MMM d, yyyy")}`;
}

function formatPct(rate: number | null): string {
  return rate === null ? "—" : `${Math.round(rate * 100)}%`;
}

function cellValue(key: string, week: KpiWeekTotals): string {
  switch (key) {
    case "apSubmitted":
    case "deposits":
    case "leadSpend":
      return formatCurrency(week[key]);
    case "hoursWorked":
      return week.hoursWorked.toLocaleString();
    case "pickupRate":
      return formatPct(week.rates.pickupRate);
    case "showRate":
      return formatPct(week.rates.showRate);
    case "closeRate":
      return formatPct(week.rates.closeRate);
    default:
      return String(week[key as keyof KpiWeekTotals] ?? 0);
  }
}

function dayCellValue(key: string, day: KpiWeekTotals["days"][number]): string {
  switch (key) {
    case "apSubmitted":
    case "deposits":
    case "leadSpend":
      return formatCurrency(day[key]);
    case "hoursWorked":
      return day.hoursWorked.toLocaleString();
    case "pickupRate":
      return day.dials > 0 ? formatPct(day.answered / day.dials) : "—";
    case "showRate":
      return day.apptsScheduled > 0
        ? formatPct(day.apptsShown / day.apptsScheduled)
        : "—";
    case "closeRate":
      return day.presentations > 0
        ? formatPct(day.dealsClosed / day.presentations)
        : "—";
    default:
      return String(day[key as keyof typeof day] ?? 0);
  }
}

export function KpiHistoryPanel() {
  const [weeks, setWeeks] = useState<KpiWeekTotals[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/agent/kpi-tracker/history");
        if (!res.ok) throw new Error();
        const { weeks } = (await res.json()) as { weeks: KpiWeekTotals[] };
        if (!cancelled) setWeeks(weeks);
      } catch {
        if (!cancelled) setError("Couldn't load your history.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function toggle(weekStart: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(weekStart)) next.delete(weekStart);
      else next.add(weekStart);
      return next;
    });
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Entry history</CardTitle>
          <p className="mt-1 text-xs text-muted">
            All time · Expand a week to review daily activity.
          </p>
        </div>
      </CardHeader>

      {error && <p className="text-sm text-red-light">{error}</p>}

      {weeks === null && !error ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : weeks && weeks.length === 0 ? (
        <p className="text-sm text-muted">No activity logged yet.</p>
      ) : (
        weeks && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted uppercase">
                  <th className="py-2 pr-4 font-semibold">Week / day</th>
                  {COLUMNS.map((c) => (
                    <th
                      key={c.key}
                      className="py-2 pr-4 text-right font-semibold whitespace-nowrap"
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weeks.map((week) => (
                  <Fragment key={week.weekStart}>
                    <tr
                      onClick={() => toggle(week.weekStart)}
                      className="cursor-pointer border-b border-border hover:bg-surface2"
                    >
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          {expanded.has(week.weekStart) ? (
                            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted" />
                          )}
                          <div>
                            <p className="font-semibold text-white">
                              {formatWeekRange(week.weekStart, week.weekEnd)}
                            </p>
                            <p className="text-xs text-muted">
                              Week total · {week.loggedDays} logged day
                              {week.loggedDays === 1 ? "" : "s"}
                            </p>
                          </div>
                        </div>
                      </td>
                      {COLUMNS.map((c) => (
                        <td
                          key={c.key}
                          className="py-3 pr-4 text-right whitespace-nowrap"
                        >
                          {cellValue(c.key, week)}
                        </td>
                      ))}
                    </tr>
                    {expanded.has(week.weekStart) &&
                      week.days.map((day) => (
                        <tr
                          key={day.date}
                          className={cn(
                            "border-b border-border/60 bg-surface2/40 text-xs text-muted",
                          )}
                        >
                          <td className="py-2 pr-4 pl-9">
                            {format(parseKpiDate(day.date), "EEE, MMM d")}
                          </td>
                          {COLUMNS.map((c) => (
                            <td
                              key={c.key}
                              className="py-2 pr-4 text-right whitespace-nowrap"
                            >
                              {dayCellValue(c.key, day)}
                            </td>
                          ))}
                        </tr>
                      ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </Card>
  );
}
