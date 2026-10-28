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

// Gold/silver/bronze, reusing the app's existing metallic badge palette
// (lib/metallic.ts / globals.css's .metal-*-surface classes — the same
// gold/gray/amber trio ResultsBands.tsx already uses for Graded/Outside-Age/
// Needs-Review) instead of inventing new colors, so the podium reads as
// "this app, turned up" rather than a clashing one-off palette.
const RANK_THEME = [
  {
    order: "md:order-2",
    surface: "metal-gold-surface",
    text: "metal-gold-text",
    badgeText: "text-black/80",
    ordinal: "1ST",
    height: "h-24 sm:h-36",
    avatarSize: "h-14 w-14 sm:h-24 sm:w-24",
    crownSize: "h-8 w-8 sm:h-11 sm:w-11",
    crownClass: "fill-[var(--gold)] text-[var(--gold-metal-dk)]",
    glow: "bg-gold",
    delay: 0.25,
  },
  {
    order: "md:order-1",
    surface: "metal-gray-surface",
    text: "metal-gray-text",
    badgeText: "text-black/80",
    ordinal: "2ND",
    height: "h-16 sm:h-24",
    avatarSize: "h-11 w-11 sm:h-16 sm:w-16",
    crownSize: "h-6 w-6 sm:h-8 sm:w-8",
    crownClass: "fill-[var(--gray-metal-hi)] text-[var(--gray-metal-dk)]",
    // Hardcoded white, not `bg-white` — that token is theme-remapped to
    // "brightest foreground" (near-black in light mode), wrong for a
    // literal silver glow that should look the same in both themes.
    glow: "bg-[#ffffff]",
    delay: 0.1,
  },
  {
    order: "md:order-3",
    surface: "metal-amber-surface",
    text: "metal-amber-text",
    badgeText: "text-white/90",
    ordinal: "3RD",
    height: "h-12 sm:h-20",
    avatarSize: "h-11 w-11 sm:h-16 sm:w-16",
    crownSize: "h-6 w-6 sm:h-8 sm:w-8",
    crownClass: "fill-[var(--amber-metal-hi)] text-[var(--amber-metal-dk)]",
    glow: "bg-amber",
    delay: 0.15,
  },
] as const;

function AnimatedAP({ value, className }: { value: number; className?: string }) {
  const animated = useCountUp(value);
  return <span className={className}>{formatAP(animated ?? 0)}</span>;
}

function Avatar({ url, name, sizeClassName }: { url: string | null; name: string; sizeClassName: string }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className={cn("shrink-0 rounded-full border-2 border-copper-gradient object-cover", sizeClassName)} />
  ) : (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border-2 border-copper-dim-gradient bg-surface2 text-base font-bold text-muted sm:text-xl",
        sizeClassName,
      )}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// A stylized laurel branch flanking the podium, built from plain SVG shapes
// (lucide has no wreath/laurel icon) — leaves spaced along a curved stem,
// shrinking and fanning out toward the top, gold-gradient filled to match
// the #1 pillar. `flip` mirrors it for the right-hand side.
function LaurelBranch({ flip }: { flip?: boolean }) {
  const leafCount = 6;
  const leaves = Array.from({ length: leafCount }, (_, i) => {
    const t = i / (leafCount - 1); // 0 (base) -> 1 (tip)
    const y = 208 - t * 196;
    const x = 32 + Math.sin(t * Math.PI * 0.9) * 10;
    const angle = -24 - t * 46;
    const scale = 1 - t * 0.3;
    return { x, y, angle, scale };
  });

  return (
    <svg
      viewBox="0 0 70 220"
      className={cn("h-36 w-auto opacity-90 drop-shadow-[0_0_14px_rgba(228,205,131,0.35)] sm:h-52", flip && "-scale-x-100")}
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
        d="M32 214 C14 176, 16 120, 34 8"
        stroke="url(#laurelGradient)"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      {leaves.map((leaf, i) => (
        <ellipse
          key={i}
          cx={leaf.x + 15 * leaf.scale}
          cy={leaf.y}
          rx={13 * leaf.scale}
          ry={5.5 * leaf.scale}
          fill="url(#laurelGradient)"
          transform={`rotate(${leaf.angle} ${leaf.x + 15 * leaf.scale} ${leaf.y})`}
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
            <div className="relative flex flex-row items-end justify-center gap-3 px-2 pt-8 pb-0 sm:gap-6 sm:px-10 sm:pt-10">
              {/* Side crests — desktop/tablet only, no room on a phone-width card. */}
              <div className="pointer-events-none absolute inset-y-0 left-0 hidden items-end pb-4 sm:flex">
                <LaurelBranch />
              </div>
              <div className="pointer-events-none absolute inset-y-0 right-0 hidden items-end pb-4 sm:flex">
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
                      "relative flex min-w-0 max-w-[140px] flex-1 flex-col items-center",
                      theme.order,
                      isPlaceholder && "opacity-40",
                    )}
                  >
                    {/* Spotlight glow behind each column — the "arcade stage
                        light" that makes the podium feel lit up rather than
                        flat. */}
                    <div
                      className={cn("pointer-events-none absolute -top-4 h-24 w-24 rounded-full opacity-20 blur-2xl sm:h-32 sm:w-32", theme.glow)}
                    />

                    {!isPlaceholder && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.4, rotate: -16 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        transition={{ delay: theme.delay + 0.25, type: "spring", stiffness: 280, damping: 14 }}
                        className="relative z-10 mb-1 drop-shadow-[0_3px_8px_rgba(0,0,0,0.55)]"
                      >
                        {/* Pulse lives on a plain inner element, not the
                            motion.div above — Framer Motion drives that
                            one's opacity via inline style, which would
                            fight a CSS keyframe animation on the same
                            property instead of layering cleanly. */}
                        <div className={i === 0 ? "animate-pulse" : undefined}>
                          <Crown className={cn(theme.crownSize, theme.crownClass)} />
                        </div>
                      </motion.div>
                    )}

                    <div className={cn("relative z-10 rounded-full p-[3px]", theme.surface)}>
                      {isPlaceholder ? (
                        <div
                          className={cn(
                            "flex items-center justify-center rounded-full border-2 border-dashed border-copper-dim/50 bg-surface2 text-muted",
                            theme.avatarSize,
                          )}
                        >
                          —
                        </div>
                      ) : (
                        <Avatar url={agent.profileImageUrl} name={agent.name} sizeClassName={theme.avatarSize} />
                      )}
                    </div>

                    <span className="relative z-10 mt-2 w-full truncate px-1 text-center text-xs font-semibold text-white sm:text-sm">
                      {isPlaceholder ? "Open Slot" : agent.name}
                    </span>
                    <AnimatedAP
                      value={isPlaceholder ? 0 : agent.issuedAP}
                      className={cn("font-scoreboard relative z-10 text-sm font-bold sm:text-xl", theme.text)}
                    />

                    {/* The pillar itself — height differs by rank, giving the
                        classic 1st-tallest podium silhouette. */}
                    <div
                      className={cn(
                        // No outer shadow utility here — .metal-*-surface
                        // (theme.surface) is hand-authored CSS outside any
                        // Tailwind layer, so it always wins the box-shadow
                        // property over a layered utility regardless of
                        // class order; its own inset bevel is the shadow.
                        "relative z-10 mt-3 flex w-full flex-col items-center justify-start gap-0.5 rounded-t-xl pt-2 pb-1 sm:mt-4 sm:pt-3",
                        theme.surface,
                        theme.height,
                      )}
                    >
                      <span className={cn("font-scoreboard text-base font-black sm:text-2xl", theme.badgeText)}>
                        {theme.ordinal}
                      </span>
                      <span className={cn("text-[10px] font-semibold sm:text-xs", theme.badgeText)}>
                        {isPlaceholder ? "—" : `${agent.issuedCount} issued`}
                      </span>
                    </div>
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
                    <Avatar url={agent.profileImageUrl} name={agent.name} sizeClassName="h-7 w-7" />
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
