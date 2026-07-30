"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Crown } from "lucide-react";
import { cn } from "@/lib/cn";
import { TimeFilterTabs } from "@/components/portal/TimeFilterTabs";
import { DashboardClient } from "@/components/portal/DashboardClient";
import { DateRange } from "@/lib/dashboardMetricsShared";
import { useCountUp } from "@/lib/useCountUp";

type Ranking = { id: string; name: string; profileImageUrl: string | null; issuedAP: number; issuedCount: number };

function formatAP(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

const PODIUM_STYLES = [
  "border-copper bg-gradient-to-b from-copper/15 to-surface order-2 md:-translate-y-4 shadow-[0_0_40px_rgba(200,121,65,0.18)]",
  "border-copper-dim bg-gradient-to-b from-surface2 to-surface order-1",
  "border-copper-dim bg-gradient-to-b from-surface2 to-surface order-3",
];

function AnimatedAP({ value, className }: { value: number; className?: string }) {
  const animated = useCountUp(value);
  return <span className={className}>{formatAP(animated ?? 0)}</span>;
}

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
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/portal/leaderboard?range=${range}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? `Failed to load leaderboard (${res.status})`);
        }
        return res.json();
      })
      .then((data) => {
        setRankings(data.rankings ?? []);
        setLoading(false);
        setLoadError(null);
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : "Failed to load leaderboard.");
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
        ) : loadError ? (
          <p className="text-sm text-red-light">{loadError}</p>
        ) : top3.length === 0 ? (
          <p className="text-sm text-muted">No issued business yet for this period.</p>
        ) : (
          <>
            <div className="flex flex-col items-stretch gap-4 md:flex-row md:items-end">
              {top3.map((agent, i) => (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: i === 0 ? 0.15 : i * 0.1, ease: "easeOut" }}
                  className={cn(
                    "relative flex flex-1 flex-col items-center gap-2 overflow-hidden rounded-2xl border-[1.5px] p-6 text-center",
                    PODIUM_STYLES[i],
                  )}
                >
                  {i === 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5, rotate: -12 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      transition={{ delay: 0.4, type: "spring", stiffness: 300, damping: 15 }}
                      className="absolute -top-1 left-1/2 -translate-x-1/2"
                    >
                      <Crown className="h-6 w-6 fill-copper text-copper" />
                    </motion.div>
                  )}
                  <span className="font-scoreboard mt-3 text-2xl font-bold text-copper">#{i + 1}</span>
                  <Avatar url={agent.profileImageUrl} name={agent.name} size={i === 0 ? 76 : 56} />
                  <span className="text-sm font-semibold text-white">{agent.name}</span>
                  <AnimatedAP
                    value={agent.issuedAP}
                    className="font-scoreboard text-2xl font-bold text-copper drop-shadow-[0_0_18px_rgba(200,121,65,0.3)]"
                  />
                  <span className="text-xs text-muted">{agent.issuedCount} issued</span>
                </motion.div>
              ))}
            </div>

            {rest.length > 0 && (
              <div className="mt-6 overflow-hidden rounded-2xl border border-border">
                {rest.map((agent, i) => (
                  <motion.div
                    key={agent.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 + i * 0.04 }}
                    className="flex items-center gap-4 border-b border-border/60 px-4 py-3 text-sm last:border-b-0 hover:bg-surface2"
                  >
                    <span className="font-scoreboard w-8 shrink-0 text-muted">#{i + 4}</span>
                    <Avatar url={agent.profileImageUrl} name={agent.name} size={28} />
                    <span className="min-w-0 flex-1 truncate text-white">{agent.name}</span>
                    <AnimatedAP value={agent.issuedAP} className="font-scoreboard shrink-0 text-copper" />
                  </motion.div>
                ))}
              </div>
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
