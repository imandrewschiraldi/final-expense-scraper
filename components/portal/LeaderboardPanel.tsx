"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Coins, Crown, Radio } from "lucide-react";
import { cn } from "@/lib/cn";
import { useCountUp } from "@/lib/useCountUp";

const POLL_MS = 20000;

type Ranking = { id: string; name: string; profileImageUrl: string | null; issuedAP: number; issuedCount: number };
type PodiumSlot = Ranking | { id: string; placeholder: true };

function formatAP(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

// Purple/red/orange — matching the reference screenshot's own palette
// (that's a casino-style leaderboard, not gold/silver/bronze) rather than
// a medal scheme. Purple is new (globals.css's --purple/.metal-purple-*,
// added for this), red/amber reuse the app's existing brand reds/ambers.
const RANK_THEME = [
  {
    order: "md:order-2",
    surface: "metal-purple-surface",
    text: "metal-purple-text",
    ordinal: "1ST",
    height: "h-28 sm:h-44",
    avatarSize: "h-16 w-16 sm:h-28 sm:w-28",
    crownSize: "h-9 w-9 sm:h-14 sm:w-14",
    glow: "bg-purple",
    delay: 0.3,
  },
  {
    order: "md:order-1",
    surface: "metal-red-surface",
    text: "metal-red-text",
    ordinal: "2ND",
    height: "h-20 sm:h-32",
    avatarSize: "h-13 w-13 sm:h-20 sm:w-20",
    crownSize: "h-7 w-7 sm:h-10 sm:w-10",
    glow: "bg-red",
    delay: 0.1,
  },
  {
    order: "md:order-3",
    surface: "metal-amber-surface",
    text: "metal-amber-text",
    ordinal: "3RD",
    height: "h-14 sm:h-24",
    avatarSize: "h-13 w-13 sm:h-20 sm:w-20",
    crownSize: "h-7 w-7 sm:h-10 sm:w-10",
    glow: "bg-amber",
    delay: 0.18,
  },
] as const;

// Every rank's crown stays gold — "royalty" color regardless of the
// pillar it's standing on, same as the reference's three crowns, which are
// all the same warm gold rather than tinted per rank.
const CROWN_CLASS = "fill-[var(--gold)] text-[var(--gold-metal-dk)]";

function AnimatedAP({ value, className }: { value: number; className?: string }) {
  const animated = useCountUp(value);
  return <span className={className}>{formatAP(animated ?? 0)}</span>;
}

function Avatar({ url, name, sizeClassName }: { url: string | null; name: string; sizeClassName: string }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className={cn("shrink-0 rounded-full object-cover", sizeClassName)} />
  ) : (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-surface2 text-base font-bold text-muted sm:text-xl",
        sizeClassName,
      )}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// A stylized laurel branch flanking the podium, built from plain SVG shapes
// (lucide has no wreath/laurel icon) — leaves spaced along a curved stem,
// shrinking and fanning out toward the top. `flip` mirrors it for the
// right-hand side.
function LaurelBranch({ flip }: { flip?: boolean }) {
  const leafCount = 8;
  const leaves = Array.from({ length: leafCount }, (_, i) => {
    const t = i / (leafCount - 1); // 0 (base) -> 1 (tip)
    const y = 212 - t * 204;
    const x = 34 + Math.sin(t * Math.PI * 0.9) * 12;
    const angle = -22 - t * 50;
    const scale = 1 - t * 0.32;
    return { x, y, angle, scale };
  });

  return (
    <svg
      viewBox="0 0 80 220"
      className={cn("h-48 w-auto drop-shadow-[0_0_20px_rgba(228,205,131,0.55)] sm:h-64", flip && "-scale-x-100")}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="laurelGradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--gold-metal-dk)" />
          <stop offset="50%" stopColor="var(--gold)" />
          <stop offset="100%" stopColor="var(--gold-metal-hi)" />
        </linearGradient>
      </defs>
      <path
        d="M34 216 C14 176, 18 118, 36 6"
        stroke="url(#laurelGradient)"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      {leaves.map((leaf, i) => (
        <ellipse
          key={i}
          cx={leaf.x + 17 * leaf.scale}
          cy={leaf.y}
          rx={15 * leaf.scale}
          ry={6.5 * leaf.scale}
          fill="url(#laurelGradient)"
          stroke="var(--gold-metal-dk)"
          strokeWidth="0.75"
          transform={`rotate(${leaf.angle} ${leaf.x + 17 * leaf.scale} ${leaf.y})`}
        />
      ))}
    </svg>
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
        <div className="mb-4 flex items-center justify-end">
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
            {/* The "stage" — a dark backdrop with a violet glow rising from
                center, separate from the page background, so the podium
                reads as a lit scene rather than floating on a plain panel.
                No overflow-hidden: the crests/crowns below are deliberately
                allowed to spill past this box's own edges. */}
            <div className="relative rounded-2xl bg-[radial-gradient(120%_90%_at_50%_0%,rgba(139,92,246,0.22),transparent_65%),linear-gradient(180deg,#0c0714_0%,#050309_100%)] px-3 pt-10 pb-0 sm:px-12 sm:pt-16">
              <div className="relative flex flex-row items-end justify-center gap-2 sm:gap-8">
                {/* Side crests — desktop/tablet only, no room on a phone-width card. */}
                <div className="pointer-events-none absolute inset-y-0 -left-2 hidden items-end pb-2 sm:-left-4 sm:flex sm:pb-6">
                  <LaurelBranch />
                </div>
                <div className="pointer-events-none absolute inset-y-0 -right-2 hidden items-end pb-2 sm:-right-4 sm:flex sm:pb-6">
                  <LaurelBranch flip />
                </div>

                {top3.map((agent, i) => {
                  const isPlaceholder = "placeholder" in agent;
                  const theme = RANK_THEME[i];
                  return (
                    <motion.div
                      key={agent.id}
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.45, delay: theme.delay, ease: "easeOut" }}
                      className={cn(
                        "relative flex min-w-0 max-w-[150px] flex-1 flex-col items-center",
                        theme.order,
                        isPlaceholder && "opacity-40",
                      )}
                    >
                      {/* Spotlight glow behind each column — the "arcade
                          stage light" the dark backdrop above is lit by. */}
                      <div
                        className={cn(
                          "pointer-events-none absolute -top-6 h-28 w-28 rounded-full opacity-30 blur-2xl sm:h-40 sm:w-40",
                          theme.glow,
                        )}
                      />

                      {!isPlaceholder && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.4, rotate: -16 }}
                          animate={{ opacity: 1, scale: 1, rotate: 0 }}
                          transition={{ delay: theme.delay + 0.25, type: "spring", stiffness: 280, damping: 14 }}
                          className="relative z-10 mb-1 drop-shadow-[0_3px_10px_rgba(0,0,0,0.6)]"
                        >
                          {/* Pulse lives on a plain inner element, not the
                              motion.div above — Framer Motion drives that
                              one's opacity via inline style, which would
                              fight a CSS keyframe animation on the same
                              property instead of layering cleanly. */}
                          <div className={i === 0 ? "animate-pulse" : undefined}>
                            <Crown className={cn(theme.crownSize, CROWN_CLASS)} />
                          </div>
                        </motion.div>
                      )}

                      <div className={cn("relative z-10 -mb-4 rounded-full p-[3px] sm:-mb-6", theme.surface)}>
                        {isPlaceholder ? (
                          <div
                            className={cn(
                              "flex items-center justify-center rounded-full border-2 border-dashed border-white/20 bg-surface2 text-muted",
                              theme.avatarSize,
                            )}
                          >
                            —
                          </div>
                        ) : (
                          <Avatar url={agent.profileImageUrl} name={agent.name} sizeClassName={theme.avatarSize} />
                        )}
                      </div>

                      {/* The pillar itself — height differs by rank, giving
                          the classic 1st-tallest podium silhouette. The
                          avatar above overlaps its top edge (-mb- above)
                          like a figure standing on the block. */}
                      <div
                        className={cn(
                          // No outer shadow utility here — .metal-*-surface
                          // (theme.surface) is hand-authored CSS outside any
                          // Tailwind layer, so it always wins the box-shadow
                          // property over a layered utility regardless of
                          // class order; its own inset bevel is the shadow.
                          "relative z-0 flex w-full flex-col items-center gap-1.5 overflow-hidden rounded-xl pt-6 pb-3 sm:gap-2 sm:pt-8 sm:pb-4",
                          theme.surface,
                          theme.height,
                        )}
                      >
                        {/* A lighter strip along the very top edge — a cheap
                            stand-in for a lit top face on a 3D block. */}
                        <div className="absolute inset-x-0 top-0 h-2.5 bg-white/25 sm:h-3.5" />

                        <span className="font-scoreboard text-xl font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.4)] sm:text-4xl">
                          {theme.ordinal}
                        </span>

                        <span className="w-full truncate px-2 text-center text-[11px] font-bold text-white/95 sm:text-sm">
                          {isPlaceholder ? "Open Slot" : agent.name}
                        </span>

                        <span className="flex items-center gap-1 rounded-full bg-black/25 px-2.5 py-1 text-[10px] font-bold text-white sm:px-3 sm:py-1.5 sm:text-sm">
                          <Coins className="h-3 w-3 shrink-0 sm:h-4 sm:w-4" />
                          <AnimatedAP value={isPlaceholder ? 0 : agent.issuedAP} className="font-scoreboard" />
                        </span>

                        {!isPlaceholder && (
                          <span className="text-[10px] font-semibold text-white/70 sm:text-xs">{agent.issuedCount} issued</span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
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
                    <Avatar
                      url={agent.profileImageUrl}
                      name={agent.name}
                      sizeClassName="h-7 w-7 border-2 border-copper-dim-gradient"
                    />
                    <span className="min-w-0 flex-1 truncate text-white">{agent.name}</span>
                    <AnimatedAP value={agent.issuedAP} className="metal-copper-text font-scoreboard shrink-0" />
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
