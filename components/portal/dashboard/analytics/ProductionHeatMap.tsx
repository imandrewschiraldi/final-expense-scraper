"use client";

import { useMemo } from "react";
import { startOfWeek, addDays, format } from "date-fns";
import { cn } from "@/lib/cn";
import { PremiumPanel } from "@/components/portal/dashboard/PremiumPanel";

type HeatDay = { date: string; ap: number; count: number; topCarrier: string | null; topProduct: string | null };

const WEEKDAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""];

function intensityClass(ratio: number) {
  if (ratio <= 0) return "bg-white/[0.04]";
  if (ratio < 0.25) return "bg-copper/20";
  if (ratio < 0.5) return "bg-copper/45";
  if (ratio < 0.75) return "bg-copper/70";
  return "bg-copper";
}

export function ProductionHeatMap({ data }: { data: HeatDay[] }) {
  const { weeks, max } = useMemo(() => {
    const byDate = new Map(data.map((d) => [d.date, d]));
    const today = new Date();
    const start = startOfWeek(addDays(today, -363), { weekStartsOn: 1 });
    const days: { date: string; day: Date; entry: HeatDay | undefined }[] = [];
    for (let i = 0; i < 371; i++) {
      const day = addDays(start, i);
      const key = format(day, "yyyy-MM-dd");
      days.push({ date: key, day, entry: byDate.get(key) });
    }
    const weeks: (typeof days)[] = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
    const max = Math.max(1, ...data.map((d) => d.ap));
    return { weeks, max };
  }, [data]);

  return (
    <PremiumPanel className="p-5">
      <h3 className="font-condensed mb-3 text-base font-extrabold tracking-wide text-white uppercase">Production Heat Map</h3>
      <div className="overflow-x-auto">
        <div className="flex gap-[3px]">
          <div className="mr-1 flex flex-col justify-between py-[1px] text-[10px] text-muted">
            {WEEKDAY_LABELS.map((l, i) => (
              <span key={i} className="h-[11px] leading-[11px]">
                {l}
              </span>
            ))}
          </div>
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map(({ date, entry }) => (
                <div
                  key={date}
                  className={cn("h-[11px] w-[11px] rounded-[2px]", intensityClass(entry ? entry.ap / max : 0))}
                  title={
                    entry
                      ? `${format(new Date(date), "MMM d, yyyy")} · ${entry.ap.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })} · ${entry.count} polic${entry.count === 1 ? "y" : "ies"}${entry.topCarrier ? ` · ${entry.topCarrier}` : ""}${entry.topProduct ? ` · ${entry.topProduct}` : ""}`
                      : format(new Date(date), "MMM d, yyyy")
                  }
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-muted">
        <span>Less</span>
        {[0, 0.2, 0.45, 0.7, 1].map((r) => (
          <div key={r} className={cn("h-[11px] w-[11px] rounded-[2px]", intensityClass(r))} />
        ))}
        <span>More</span>
      </div>
    </PremiumPanel>
  );
}
