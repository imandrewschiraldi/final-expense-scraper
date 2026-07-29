"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { TimeFilterTabs } from "@/components/portal/TimeFilterTabs";
import { DashboardClient } from "@/components/portal/DashboardClient";
import { DateRange } from "@/lib/dashboardMetricsShared";

type Ranking = { id: string; name: string; profileImageUrl: string | null; issuedAP: number; issuedCount: number };

function formatAP(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

const PODIUM_STYLES = [
  "border-copper bg-copper/10 order-2 md:-translate-y-3",
  "border-copper-dim bg-surface order-1",
  "border-copper-dim bg-surface order-3",
];

function Avatar({ url, name, size }: { url: string | null; name: string; size: number }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      style={{ width: size, height: size }}
      className="rounded-full border-2 border-copper object-cover"
    />
  ) : (
    <div
      style={{ width: size, height: size }}
      className="flex items-center justify-center rounded-full border-2 border-copper-dim bg-surface2 text-xl font-bold text-muted"
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export function LeaderboardPanel({ isAdmin }: { isAdmin: boolean }) {
  const [range, setRange] = useState<DateRange>("mtd");
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/portal/leaderboard?range=${range}`)
      .then((res) => res.json())
      .then((data) => {
        setRankings(data.rankings ?? []);
        setLoading(false);
      });
  }, [range]);

  const top3 = rankings.slice(0, 3);
  const rest = rankings.slice(3, 10);

  return (
    <div className="space-y-10">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-condensed text-lg font-extrabold tracking-wide text-white uppercase">Top Agents</h2>
          <TimeFilterTabs value={range} onChange={setRange} />
        </div>

        {loading ? (
          <p className="text-sm text-muted">Loading...</p>
        ) : top3.length === 0 ? (
          <p className="text-sm text-muted">No issued business yet for this period.</p>
        ) : (
          <>
            <div className="flex flex-col items-stretch gap-4 md:flex-row md:items-end">
              {top3.map((agent, i) => (
                <div
                  key={agent.id}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-2 rounded-[10px] border-[1.5px] p-5 text-center",
                    PODIUM_STYLES[i],
                  )}
                >
                  <span className="font-scoreboard text-2xl font-bold text-copper">#{i + 1}</span>
                  <Avatar url={agent.profileImageUrl} name={agent.name} size={i === 0 ? 72 : 56} />
                  <span className="text-sm font-semibold text-white">{agent.name}</span>
                  <span className="font-scoreboard text-xl font-bold text-copper">{formatAP(agent.issuedAP)}</span>
                  <span className="text-xs text-muted">{agent.issuedCount} issued</span>
                </div>
              ))}
            </div>

            {rest.length > 0 && (
              <table className="mt-6 w-full text-left text-sm">
                <tbody>
                  {rest.map((agent, i) => (
                    <tr key={agent.id} className="border-b border-border/60">
                      <td className="py-2 pr-4 text-muted">#{i + 4}</td>
                      <td className="py-2 pr-4 text-white">{agent.name}</td>
                      <td className="py-2 pr-4 text-right text-copper">{formatAP(agent.issuedAP)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      <div>
        <DashboardClient scope="team" isAdmin={isAdmin} heading="Team Dashboard" />
      </div>
    </div>
  );
}
