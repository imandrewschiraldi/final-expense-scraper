"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { DashboardRangeSelect } from "@/components/portal/dashboard/DashboardRangeSelect";
import { type DashboardRange } from "@/lib/dashboardRange";
import { formatCurrency } from "@/lib/formatMoney";
import type { AgentKpiTeamRow } from "@/lib/kpiTracker";

const COLUMNS: { key: string; label: string }[] = [
  { key: "daysActive", label: "Days active" },
  { key: "dials", label: "Dials" },
  { key: "answered", label: "Answered" },
  { key: "apptsShown", label: "Appts. shown" },
  { key: "presentations", label: "Pres." },
  { key: "dealsClosed", label: "Closed" },
  { key: "apSubmitted", label: "AP submitted" },
  { key: "deposits", label: "Deposits" },
  { key: "leadSpend", label: "Lead spend" },
  { key: "hoursWorked", label: "Hours" },
  { key: "pickupRate", label: "Pick-up" },
  { key: "showRate", label: "Show" },
  { key: "closeRate", label: "Close" },
];

function formatPct(rate: number | null): string {
  return rate === null ? "—" : `${Math.round(rate * 100)}%`;
}

function cellValue(key: string, row: AgentKpiTeamRow): string {
  switch (key) {
    case "apSubmitted":
    case "deposits":
    case "leadSpend":
      return formatCurrency(row[key]);
    case "hoursWorked":
      return row.hoursWorked.toLocaleString();
    case "pickupRate":
      return formatPct(row.rates.pickupRate);
    case "showRate":
      return formatPct(row.rates.showRate);
    case "closeRate":
      return formatPct(row.rates.closeRate);
    default:
      return String(row[key as keyof AgentKpiTeamRow] ?? 0);
  }
}

export function KpiTrackerAdminPanel() {
  const [range, setRange] = useState<DashboardRange>("weekly");
  const [agents, setAgents] = useState<AgentKpiTeamRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/kpi-tracker?range=${range}`);
        if (!res.ok) throw new Error();
        const { agents } = (await res.json()) as { agents: AgentKpiTeamRow[] };
        if (cancelled) return;
        setError(null);
        setAgents(agents);
      } catch {
        if (!cancelled) setError("Couldn't load the team's KPI data.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [range]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team activity</CardTitle>
        <DashboardRangeSelect value={range} onChange={setRange} />
      </CardHeader>

      {error && <p className="text-sm text-red-light">{error}</p>}

      {agents === null && !error ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : agents && agents.length === 0 ? (
        <p className="text-sm text-muted">No agents found.</p>
      ) : (
        agents && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted uppercase">
                  <th className="py-2 pr-4 font-semibold">Agent</th>
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
                {agents.map((row) => (
                  <tr
                    key={row.agentId}
                    className="border-b border-border hover:bg-surface2"
                  >
                    <td className="py-3 pr-4 font-semibold text-white whitespace-nowrap">
                      {row.name}
                    </td>
                    {COLUMNS.map((c) => (
                      <td
                        key={c.key}
                        className="py-3 pr-4 text-right whitespace-nowrap"
                      >
                        {cellValue(c.key, row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </Card>
  );
}
