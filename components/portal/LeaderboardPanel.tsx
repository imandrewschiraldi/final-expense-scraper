"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Crown, Radio } from "lucide-react";
import { cn } from "@/lib/cn";
import { useCountUp } from "@/lib/useCountUp";

const POLL_MS = 20000;

type Ranking = { id: string; name: string; profileImageUrl: string | null; issuedAP: number; issuedCount: number };
type PodiumSlot = Ranking | { id: string; placeholder: true };

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

export function LeaderboardPanel() {
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    function load() {
      fetch("/api/portal/leaderboard")
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
    }

    load();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  const top3: PodiumSlot[] = Array.from({ length: 3 }, (_, i) => rankings[i] ?? { id: `empty-${i}`, placeholder: true });
  const rest = rankings.slice(3);

  return (
    <div className="space-y-10">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-condensed text-lg font-extrabold tracking-wide text-white uppercase">Top Agents</h2>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-green-light">
            <Radio className="h-3.5 w-3.5 animate-pulse" />
            Live
          </span>
        </div>

        {loading ? (
          <p className="text-sm text-muted">Loading...</p>
        ) : loadError ? (
          <p className="text-sm text-red-light">{loadError}</p>
        ) : (
          <>
            <div className="flex flex-col items-stretch gap-4 md:flex-row md:items-end">
              {top3.map((agent, i) => {
                const isPlaceholder = "placeholder" in agent;
                return (
                  <motion.div
                    key={agent.id}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: i === 0 ? 0.15 : i * 0.1, ease: "easeOut" }}
                    className={cn(
                      "relative flex flex-1 flex-col items-center gap-2 overflow-hidden rounded-2xl border-[1.5px] p-6 text-center",
                      PODIUM_STYLES[i],
                      isPlaceholder && "opacity-40",
                    )}
                  >
                    {i === 0 && !isPlaceholder && (
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
                    {isPlaceholder ? (
                      <div
                        style={{ width: i === 0 ? 76 : 56, height: i === 0 ? 76 : 56 }}
                        className="flex items-center justify-center rounded-full border-2 border-dashed border-copper-dim/50 bg-surface2 text-muted"
                      >
                        —
                      </div>
                    ) : (
                      <Avatar url={agent.profileImageUrl} name={agent.name} size={i === 0 ? 76 : 56} />
                    )}
                    <span className="text-sm font-semibold text-white">{isPlaceholder ? "Open Slot" : agent.name}</span>
                    <AnimatedAP
                      value={isPlaceholder ? 0 : agent.issuedAP}
                      className="font-scoreboard text-2xl font-bold text-copper drop-shadow-[0_0_18px_rgba(200,121,65,0.3)]"
                    />
                    <span className="text-xs text-muted">{isPlaceholder ? "—" : `${agent.issuedCount} issued`}</span>
                  </motion.div>
                );
              })}
            </div>

            {rest.length > 0 && (
              <div className="mt-6 max-h-[560px] overflow-y-auto rounded-2xl border border-border">
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
    </div>
  );
}
