"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Stepper } from "@/components/ui/Stepper";
import { RangeSlider } from "@/components/ui/RangeSlider";
import { DashboardRangeSelect } from "@/components/portal/dashboard/DashboardRangeSelect";
import {
  DASHBOARD_RANGE_LABELS,
  type DashboardRange,
} from "@/lib/dashboardRange";
import { formatCurrency } from "@/lib/formatMoney";
import {
  MAX_LEAD_SPEND,
  type KpiDailyTotals,
  type KpiPeriodSummary,
} from "@/lib/kpiTracker";

type EditableField =
  | "deposits"
  | "leadSpend"
  | "hoursWorked"
  | "apptsScheduled"
  | "dials"
  | "answered"
  | "apptsShown"
  | "presentations"
  | "dealsClosed";

const EMPTY_TOTALS: Omit<KpiDailyTotals, "date" | "apSubmitted"> = {
  deposits: 0,
  leadSpend: 0,
  hoursWorked: 0,
  apptsScheduled: 0,
  dials: 0,
  answered: 0,
  apptsShown: 0,
  presentations: 0,
  dealsClosed: 0,
};

async function fetchSummary(range: DashboardRange): Promise<KpiPeriodSummary> {
  const res = await fetch(`/api/agent/kpi-tracker/summary?range=${range}`);
  if (!res.ok) throw new Error("Failed to load summary");
  const { summary } = (await res.json()) as { summary: KpiPeriodSummary };
  return summary;
}

function DollarInput({
  value,
  onChange,
  placeholder = "$0",
}: {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
}) {
  // Owns its own text while the user is typing rather than mirroring
  // `value` on every render — the parent's optimistic state updates on
  // every keystroke too, so syncing back from it here would just be
  // reflecting this same input's last change at itself.
  const [text, setText] = useState(value === 0 ? "" : String(value));

  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted">
        $
      </span>
      <input
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        value={text}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9.]/g, "");
          setText(raw);
          const n = Number(raw);
          onChange(Number.isFinite(n) ? n : 0);
        }}
        onBlur={() => setText(value === 0 ? "" : String(value))}
        className="w-full rounded-lg border border-copper-focus-gradient bg-surface py-2 pr-3 pl-6 text-sm text-foreground placeholder:text-muted focus:outline-none"
      />
    </div>
  );
}

function useDebouncedSave(delayMs: number) {
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const save = useCallback(
    (key: string, fn: () => void) => {
      const existing = timers.current.get(key);
      if (existing) clearTimeout(existing);
      timers.current.set(
        key,
        setTimeout(() => {
          timers.current.delete(key);
          fn();
        }, delayMs),
      );
    },
    [delayMs],
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach(clearTimeout);
    };
  }, []);

  return save;
}

function SummaryTile({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <div className="rounded-[10px] border border-border bg-surface p-5">
      <p className="font-condensed text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
        {label}
      </p>
      <p className="font-condensed metal-copper-text mt-1 text-[28px] leading-none font-black">
        {value}
      </p>
      <p className="mt-1.5 text-xs text-muted">{caption}</p>
    </div>
  );
}

function formatPct(rate: number | null): string {
  return rate === null ? "—" : `${Math.round(rate * 100)}%`;
}

export function KpiTrackerPanel() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState(EMPTY_TOTALS);
  const [apSubmitted, setApSubmitted] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [range, setRange] = useState<DashboardRange>("weekly");
  const [summary, setSummary] = useState<KpiPeriodSummary | null>(null);

  const save = useDebouncedSave(500);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/agent/kpi-tracker/entry?date=${today}`);
        if (!res.ok) throw new Error();
        const { entry } = (await res.json()) as { entry: KpiDailyTotals };
        if (cancelled) return;
        setTotals(entry);
        setApSubmitted(entry.apSubmitted);
      } catch {
        if (!cancelled) setError("Couldn't load today's activity.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [today]);

  useEffect(() => {
    let cancelled = false;
    fetchSummary(range)
      .then((summary) => {
        if (!cancelled) setSummary(summary);
      })
      .catch(() => {
        // Period summary is supplementary — a failed refresh just leaves the
        // last-known totals showing rather than blanking the card.
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  function updateField(field: EditableField, value: number, immediate = false) {
    setTotals((prev) => ({ ...prev, [field]: value }));
    const commit = () => {
      fetch("/api/agent/kpi-tracker/entry", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ date: today, [field]: value }),
      })
        .then(() => fetchSummary(range))
        .then(setSummary)
        .catch(() => setError("A change didn't save — try again."));
    };
    if (immediate) commit();
    else save(field, commit);
  }

  if (loading) {
    return (
      <p className="text-sm text-muted">Loading today&rsquo;s activity…</p>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            Log activity for {format(new Date(), "EEE, MMM d, yyyy")}
          </CardTitle>
          <p className="text-xs text-muted">Changes save automatically</p>
        </CardHeader>
        {error && <p className="mb-4 text-xs text-red-light">{error}</p>}

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-5">
            <h3 className="font-condensed text-sm font-bold text-white uppercase">
              Daily activity
            </h3>

            <div>
              <label className="mb-1.5 block text-xs text-muted">
                AP submitted
              </label>
              <div className="rounded-lg border border-border bg-surface2 px-3 py-2 text-sm text-foreground">
                {formatCurrency(apSubmitted)}
              </div>
              <p className="mt-1.5 text-[11px] text-muted">
                From submitted policies
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-muted">
                Deposits
              </label>
              <DollarInput
                value={totals.deposits}
                onChange={(v) => updateField("deposits", v)}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-muted">
                Lead spend
              </label>
              <DollarInput
                value={totals.leadSpend}
                onChange={(v) =>
                  updateField("leadSpend", Math.min(v, MAX_LEAD_SPEND))
                }
              />
              <div className="mt-3">
                <RangeSlider
                  value={totals.leadSpend}
                  min={0}
                  max={MAX_LEAD_SPEND}
                  step={50}
                  onChange={(v) => updateField("leadSpend", v)}
                />
                <div className="mt-1 flex justify-between text-[11px] text-muted">
                  <span>$0</span>
                  <span>{formatCurrency(MAX_LEAD_SPEND)}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-muted">
                Hours worked
              </label>
              <Stepper
                value={totals.hoursWorked}
                onChange={(v) => updateField("hoursWorked", v, true)}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-muted">
                Appts. scheduled
              </label>
              <Stepper
                value={totals.apptsScheduled}
                onChange={(v) => updateField("apptsScheduled", v, true)}
              />
            </div>
          </div>

          <div className="space-y-5">
            <h3 className="font-condensed text-sm font-bold text-white uppercase">
              Activity
            </h3>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="mb-1.5 block text-xs text-muted">Dials</label>
                <Stepper
                  value={totals.dials}
                  onChange={(v) => updateField("dials", v, true)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-muted">
                  Answered
                </label>
                <Stepper
                  value={totals.answered}
                  onChange={(v) => updateField("answered", v, true)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-muted">
                  Appts. shown
                </label>
                <Stepper
                  value={totals.apptsShown}
                  onChange={(v) => updateField("apptsShown", v, true)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs text-muted">
                  Presentations
                </label>
                <Stepper
                  value={totals.presentations}
                  onChange={(v) => updateField("presentations", v, true)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-muted">
                  Deals closed
                </label>
                <Stepper
                  value={totals.dealsClosed}
                  onChange={(v) => updateField("dealsClosed", v, true)}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Period summary</CardTitle>
          <DashboardRangeSelect value={range} onChange={setRange} />
        </CardHeader>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <SummaryTile
            label="Pick-up rate"
            value={formatPct(summary?.rates.pickupRate ?? null)}
            caption={
              summary && summary.dials > 0
                ? `${summary.answered} of ${summary.dials} dials`
                : "No dials logged"
            }
          />
          <SummaryTile
            label="Show rate"
            value={formatPct(summary?.rates.showRate ?? null)}
            caption={
              summary && summary.apptsScheduled > 0
                ? `${summary.apptsShown} of ${summary.apptsScheduled} appts.`
                : "No appt's scheduled"
            }
          />
          <SummaryTile
            label="Close rate"
            value={formatPct(summary?.rates.closeRate ?? null)}
            caption={
              summary && summary.presentations > 0
                ? `${summary.dealsClosed} of ${summary.presentations} presentations`
                : "No presentations logged"
            }
          />
          <SummaryTile
            label="AP per day"
            value={
              summary?.rates.apPerDay != null
                ? formatCurrency(summary.rates.apPerDay)
                : "—"
            }
            caption={
              summary && summary.daysActive > 0
                ? `Over ${summary.daysActive} active days`
                : "No active days"
            }
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <SummaryTile
            label="AP submitted"
            value={formatCurrency(summary?.apSubmitted ?? 0)}
            caption={DASHBOARD_RANGE_LABELS[range]}
          />
          <SummaryTile
            label="Deposits"
            value={formatCurrency(summary?.deposits ?? 0)}
            caption={DASHBOARD_RANGE_LABELS[range]}
          />
          <SummaryTile
            label="Lead spend"
            value={formatCurrency(summary?.leadSpend ?? 0)}
            caption={DASHBOARD_RANGE_LABELS[range]}
          />
          <SummaryTile
            label="Days active"
            value={String(summary?.daysActive ?? 0)}
            caption="Days with any logged activity"
          />
        </div>
      </Card>
    </div>
  );
}
