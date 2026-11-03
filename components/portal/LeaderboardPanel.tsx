"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/cn";
import { optimizableImageUrl } from "@/lib/profileImage";
import { useCountUp } from "@/lib/useCountUp";

const POLL_MS = 20000;

const PERIODS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "all", label: "All Time" },
] as const;
type Period = (typeof PERIODS)[number]["value"];

const PERIOD_SUBTITLE: Record<Period, string> = {
  daily: "Today",
  weekly: "This Week",
  monthly: "This Month",
  all: "All Time",
};

type Ranking = { id: string; name: string; profileImageUrl: string | null; issuedAP: number; issuedCount: number };
type PodiumSlot = Ranking | { id: string; placeholder: true };

// Compact one-decimal style ("$80.3K") rather than full currency — matches
// the Arena reference everywhere a dollar figure shows, podium and list
// alike.
function formatCompactAP(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${Math.round(value)}`;
}

function AnimatedAP({ value, className }: { value: number; className?: string }) {
  const animated = useCountUp(value);
  return <span className={className}>{formatCompactAP(animated ?? 0)}</span>;
}

// This whole stage is a fixed dark "arena" by design, regardless of the
// site's light/dark toggle (only the page behind it changes with theme),
// so every color here is a literal value, not a theme token — bare
// Tailwind color names like `white`/`muted`/`border` resolve to this app's
// theme-remapped tokens (app/globals.css redefines them per light/dark),
// which would make text go dark-on-dark here in light mode.
const TEXT = "#F3EEFF";

const RANK_THEME = [
  {
    rank: 1,
    order: "md:order-2",
    elevated: true,
    color: "#FFD23F",
    glow: "rgba(255,210,63,0.65)",
    avatarSize: "h-20 w-20 sm:h-28 sm:w-28",
    avatarPixels: 224,
    nameSize: "text-base sm:text-xl",
    apSize: "text-2xl sm:text-4xl",
    delay: 0.18,
  },
  {
    rank: 2,
    order: "md:order-1",
    elevated: false,
    color: "#3AD6FF",
    glow: "rgba(58,214,255,0.6)",
    avatarSize: "h-16 w-16 sm:h-24 sm:w-24",
    avatarPixels: 192,
    nameSize: "text-sm sm:text-lg",
    apSize: "text-xl sm:text-3xl",
    delay: 0,
  },
  {
    rank: 3,
    order: "md:order-3",
    elevated: false,
    color: "#FF3BA0",
    glow: "rgba(255,59,160,0.6)",
    avatarSize: "h-16 w-16 sm:h-24 sm:w-24",
    avatarPixels: 192,
    nameSize: "text-sm sm:text-lg",
    apSize: "text-xl sm:text-3xl",
    delay: 0.09,
  },
] as const;

// A faint per-rank textured background standing in for the reference's
// illustrated card faces (a cyan X-lattice, a gold circuit-plate grid, a
// magenta faceted-crystal fan) — CSS gradients only, no image asset, so
// the card reads as a textured panel rather than a flat bordered box.
function cardPattern(rank: 1 | 2 | 3, color: string): CSSProperties {
  const base = "linear-gradient(180deg, rgba(14,16,30,0.9), rgba(6,7,14,0.92))";
  if (rank === 2) {
    return {
      backgroundImage: `repeating-linear-gradient(45deg, ${color}33 0px, ${color}33 1px, transparent 1px, transparent 13px), repeating-linear-gradient(-45deg, ${color}33 0px, ${color}33 1px, transparent 1px, transparent 13px), ${base}`,
    };
  }
  if (rank === 3) {
    return {
      backgroundImage: `repeating-conic-gradient(from 0deg at 50% 40%, ${color}26 0deg 14deg, transparent 14deg 28deg), ${base}`,
    };
  }
  return {
    backgroundImage: `radial-gradient(circle at 50% 36%, ${color}2e 0%, transparent 48%), repeating-linear-gradient(0deg, ${color}1f 0px, ${color}1f 1px, transparent 1px, transparent 15px), repeating-linear-gradient(90deg, ${color}1f 0px, ${color}1f 1px, transparent 1px, transparent 15px), ${base}`,
  };
}

// Two-letter initials (first + last name) rather than just one — matches
// the Arena reference's avatar badges ("WB", "CC", "JF").
function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// `pixels` drives next/image's actual optimized output size (2x the
// biggest on-screen size it's used at, for retina) — a plain <img> here
// would just hand the browser whatever resolution was originally uploaded
// and let it naively scale that, which is what was reading as blurry at
// the podium's larger avatar sizes.
function Avatar({ url, name, sizeClassName, pixels = 96 }: { url: string | null; name: string; sizeClassName: string; pixels?: number }) {
  // Only for a URL next/image is actually configured to optimize (see
  // lib/profileImage.ts) — anything else throws at render, and this is a
  // shared page everyone views, so one entrant's bad URL would otherwise
  // crash it for the whole agency, not just that one account.
  const src = optimizableImageUrl(url);
  return src ? (
    <Image src={src} alt="" width={pixels} height={pixels} quality={90} className={cn("shrink-0 rounded-full object-cover", sizeClassName)} />
  ) : (
    <div
      className={cn("flex shrink-0 items-center justify-center rounded-full text-base font-bold sm:text-xl", sizeClassName)}
      style={{ backgroundColor: "#11131D", color: TEXT }}
    >
      {initials(name)}
    </div>
  );
}

/** Four small L-shaped corner marks over a podium card — a common sci-fi
 *  HUD framing device, cheaper and more distinctive than an actual
 *  hexagonal card shape (which would fight the card's own rounded-rect
 *  content layout). */
function CornerBrackets({ color }: { color: string }) {
  const common = "pointer-events-none absolute h-4 w-4 sm:h-5 sm:w-5";
  return (
    <>
      <span className={cn(common, "top-0 left-0 border-t-2 border-l-2")} style={{ borderColor: color }} aria-hidden="true" />
      <span className={cn(common, "top-0 right-0 border-t-2 border-r-2")} style={{ borderColor: color }} aria-hidden="true" />
      <span className={cn(common, "bottom-0 left-0 border-b-2 border-l-2")} style={{ borderColor: color }} aria-hidden="true" />
      <span className={cn(common, "bottom-0 right-0 border-b-2 border-r-2")} style={{ borderColor: color }} aria-hidden="true" />
    </>
  );
}

export function LeaderboardPanel() {
  const { data: session } = useSession();
  const isAdmin = session?.user.role === "ADMIN";

  const [period, setPeriod] = useState<Period>("monthly");
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Agency-wide, not per-viewer — whatever the admin last set it to,
  // read fresh off every leaderboard fetch rather than its own endpoint so
  // one poll keeps both the rankings and this flag in sync.
  const [allTimeEnabled, setAllTimeEnabled] = useState(false);
  const [togglingAllTime, setTogglingAllTime] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let first = true;

    function load() {
      if (first) {
        setLoading(true);
        first = false;
      }
      fetch(`/api/portal/leaderboard?period=${period}`)
        .then(async (res) => {
          if (!res.ok) {
            const body = await res.json().catch(() => null);
            throw new Error(body?.error ?? `Failed to load leaderboard (${res.status})`);
          }
          return res.json();
        })
        .then((data) => {
          if (cancelled) return;
          setRankings(data.rankings ?? []);
          setAllTimeEnabled(!!data.allTimeEnabled);
          // The server falls an "all" request back to "monthly" when the
          // toggle is off — e.g. this tab was still open when an admin
          // turned it off elsewhere. Syncing here keeps the active tab
          // honest instead of showing "All Time" highlighted over monthly
          // data.
          if (data.period && data.period !== period) setPeriod(data.period);
          setLoading(false);
          setLoadError(null);
        })
        .catch((err) => {
          if (cancelled) return;
          setLoadError(err instanceof Error ? err.message : "Failed to load leaderboard.");
          setLoading(false);
        });
    }

    load();
    const interval = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [period]);

  async function toggleAllTime() {
    setTogglingAllTime(true);
    try {
      const res = await fetch("/api/admin/leaderboard-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaderboardAllTimeEnabled: !allTimeEnabled }),
      });
      if (res.ok) {
        const data = await res.json();
        setAllTimeEnabled(!!data.leaderboardAllTimeEnabled);
      }
    } finally {
      setTogglingAllTime(false);
    }
  }

  const top3: PodiumSlot[] = Array.from({ length: 3 }, (_, i) => rankings[i] ?? { id: `empty-${i}`, placeholder: true });
  const rest = rankings.slice(3);

  return (
    <div className="space-y-10">
      <div>
        {/* The "stage" — a deep-space violet-to-black vignette instead of
            the earlier copper radial, covering the WHOLE leaderboard
            (title, period tabs, podium, and the Hall of Elites list below
            it), always rendered regardless of load state so the title and
            floor are never hidden behind a bare loading line. */}
        <div
          className="relative overflow-hidden rounded-2xl px-3 pt-10 pb-8 sm:px-10"
          style={{ background: "radial-gradient(ellipse 90% 70% at 50% 0%, #241036 0%, #120a1e 42%, #050308 100%)" }}
        >
          {/* Faint circuit-board texture across the whole stage — a tiled
              line grid plus scattered dots, standing in for the reference's
              PCB-trace background without a hand-drawn image asset. */}
          <div className="arena-circuit pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />

          {/* Perspective grid floor, confined to roughly where the podium
              sits so it reads as the stage's own ground rather than
              bleeding behind the Hall of Elites list too. */}
          <div className="arena-floor pointer-events-none absolute inset-x-0 bottom-0 h-[58%]" aria-hidden="true" />

          {/* Title block — "THE ARENA" as a cyan-to-white-to-magenta
              gradient fill (bg-clip-text) rather than flat white, matching
              the Arena reference's holographic lettering, plus the live
              period filter. */}
          <div className="relative flex flex-col items-center gap-2 pb-8 text-center sm:gap-3">
            <h1
              className="font-bungee bg-clip-text text-4xl tracking-tight text-transparent sm:text-6xl md:text-7xl"
              style={{
                backgroundImage: "linear-gradient(90deg, #3AD6FF 0%, #FFFFFF 50%, #FF3BA0 100%)",
                filter: "drop-shadow(0 0 20px rgba(255,255,255,0.4))",
              }}
            >
              THE ARENA
            </h1>
            <p className="text-[11px] font-bold tracking-[0.35em] uppercase sm:text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
              [ Standings &mdash; {PERIOD_SUBTITLE[period]} ]
            </p>

            <div
              role="tablist"
              aria-label="Leaderboard period"
              className="mt-3 flex gap-1.5 rounded-full p-1.5 sm:gap-2 sm:p-2"
              style={{ background: "rgba(10,12,22,0.75)", border: "1px solid rgba(61,214,255,0.3)" }}
            >
              {PERIODS.filter((p) => p.value !== "all" || allTimeEnabled).map((p) => {
                const active = period === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setPeriod(p.value)}
                    className="rounded-full px-4 py-2 text-xs font-bold tracking-wide uppercase transition-colors sm:px-6 sm:py-2.5 sm:text-sm"
                    style={
                      active
                        ? { background: "linear-gradient(180deg, #6EEFF2, #2DB8D8)", color: "#04141A", boxShadow: "0 0 16px rgba(61,214,255,0.6)" }
                        : { color: "rgba(255,255,255,0.5)" }
                    }
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={toggleAllTime}
                disabled={togglingAllTime}
                className="text-[11px] font-bold tracking-wide uppercase transition-colors disabled:opacity-50"
                style={{ color: allTimeEnabled ? "#3AD6FF" : "rgba(255,255,255,0.35)" }}
              >
                {togglingAllTime ? "Saving..." : `All Time Tab: ${allTimeEnabled ? "On" : "Off"} for Everyone`}
              </button>
            )}
          </div>

          {loading ? (
            <p className="relative py-10 text-center text-sm" style={{ color: TEXT }}>
              Loading...
            </p>
          ) : loadError ? (
            <p className="relative py-10 text-center text-sm" style={{ color: "#FF8A8A" }}>
              {loadError}
            </p>
          ) : (
            <>
              <div className="relative flex flex-row items-end justify-center gap-2 sm:gap-8">
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
                        "relative flex min-w-0 flex-1 flex-col items-center",
                        theme.order,
                        theme.elevated && "-mt-5 sm:-mt-8",
                        isPlaceholder && "opacity-40",
                      )}
                    >
                      {/* #1's halo — a flat elliptical ring fed by an upward
                          spotlight cone from the card, with a slow-spinning
                          radial burst behind it, rather than a small pill of
                          light — matches the reference's "portal" above the
                          gold card. */}
                      {theme.rank === 1 && !isPlaceholder && (
                        <div className="relative mb-0.5 flex flex-col items-center" aria-hidden="true">
                          <div
                            className="h-7 w-10 sm:h-10 sm:w-14"
                            style={{
                              background: `linear-gradient(to top, ${theme.color}, transparent)`,
                              clipPath: "polygon(38% 100%, 62% 100%, 100% 0%, 0% 0%)",
                              opacity: 0.6,
                            }}
                          />
                          <div className="relative -mt-1 h-7 w-32 sm:h-9 sm:w-44">
                            <div
                              className="arena-rays absolute inset-0"
                              style={{
                                background: `repeating-conic-gradient(${theme.color}66 0deg 4deg, transparent 4deg 18deg)`,
                                maskImage: "radial-gradient(ellipse, transparent 30%, black 40%, black 58%, transparent 68%)",
                                WebkitMaskImage: "radial-gradient(ellipse, transparent 30%, black 40%, black 58%, transparent 68%)",
                              }}
                            />
                            <div
                              className="absolute inset-0 m-auto h-5 w-24 rounded-full sm:h-7 sm:w-32"
                              style={{ border: `1.5px solid ${theme.color}`, boxShadow: `0 0 24px ${theme.glow}, inset 0 0 16px ${theme.glow}` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* The card itself is just the illustrated "plate" —
                          texture, frame, avatar socket and rank badge. Name,
                          value and the policy count sit OUTSIDE it, in the
                          open space below, matching the reference (the
                          bordered card never contains that text). */}
                      <div
                        className={cn("relative w-full max-w-[200px] rounded-2xl p-4 pt-9 pb-7 text-center sm:p-5 sm:pt-11 sm:pb-9", theme.rank === 1 && "arena-pulse")}
                        style={{
                          ...cardPattern(theme.rank, theme.color),
                          border: `1.5px solid ${theme.color}`,
                          boxShadow: `0 0 28px ${theme.glow}, inset 0 0 24px rgba(0,0,0,0.5)`,
                          ["--arena-glow" as string]: theme.glow,
                        }}
                      >
                        <CornerBrackets color={theme.color} />

                        <div className="mx-auto w-fit">
                          <div
                            className={cn("relative mx-auto flex items-center justify-center rounded-full", theme.avatarSize)}
                            style={{ border: `2.5px solid ${theme.color}`, boxShadow: `0 0 20px ${theme.glow}` }}
                          >
                            {/* Second, dashed ring inset inside the solid one — the
                                Arena reference frames each avatar with a double
                                ring rather than a single border. */}
                            <div
                              className="pointer-events-none absolute inset-[3px] rounded-full border border-dashed"
                              style={{ borderColor: theme.color, opacity: 0.45 }}
                              aria-hidden="true"
                            />
                            {isPlaceholder ? (
                              <div
                                className="flex h-[calc(100%-5px)] w-[calc(100%-5px)] items-center justify-center rounded-full border-2 border-dashed text-sm"
                                style={{ borderColor: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.35)" }}
                              >
                                &mdash;
                              </div>
                            ) : (
                              <Avatar url={agent.profileImageUrl} name={agent.name} sizeClassName="h-full w-full" pixels={theme.avatarPixels} />
                            )}
                          </div>
                          {!isPlaceholder && (
                            <div
                              className="relative z-10 mx-auto -mt-3 flex h-6 w-6 items-center justify-center text-[11px] font-extrabold sm:h-7 sm:w-7 sm:text-xs"
                              style={{
                                background: theme.color,
                                color: "#07070C",
                                clipPath: "polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)",
                                boxShadow: `0 0 12px ${theme.glow}`,
                              }}
                            >
                              {theme.rank}
                            </div>
                          )}
                        </div>
                      </div>

                      {!isPlaceholder && (
                        <div className="mt-2.5 w-full max-w-[200px] text-center">
                          <p className={cn("truncate font-bold text-white", theme.nameSize)}>{agent.name}</p>
                          <p className={cn("mt-1 font-extrabold tracking-tight", theme.apSize)} style={{ color: theme.color, textShadow: `0 0 16px ${theme.glow}` }}>
                            <AnimatedAP value={agent.issuedAP} />
                          </p>
                          <div className="mx-auto mt-1.5 w-10 border-t border-dashed" style={{ borderColor: theme.color, opacity: 0.4 }} aria-hidden="true" />
                          <p className="mt-1.5 text-[10px] tracking-widest uppercase sm:text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                            {agent.issuedCount} {agent.issuedCount === 1 ? "Policy" : "Policies"}
                          </p>
                        </div>
                      )}

                      {/* Light-beam cone (a clipped trapezoid, not a thin line)
                          narrowing up toward the card and widening down onto
                          the hex pad below it. */}
                      <div
                        className="arena-beam h-10 w-8 sm:h-16 sm:w-12"
                        style={{
                          background: `linear-gradient(to bottom, ${theme.color}, transparent)`,
                          clipPath: "polygon(42% 0%, 58% 0%, 100% 100%, 0% 100%)",
                          opacity: 0.55,
                        }}
                        aria-hidden="true"
                      />
                      {/* Hexagonal landing pad with a dashed inner hex and a
                          glowing elliptical "pool" inset, standing in for
                          the Arena reference's hex floor pads. */}
                      <div className="relative h-6 w-20 sm:h-8 sm:w-28" aria-hidden="true">
                        <div
                          className="arena-hex absolute inset-0"
                          style={{ background: `${theme.color}1a`, border: `1.5px solid ${theme.color}`, boxShadow: `0 0 24px ${theme.glow}` }}
                        />
                        <div className="arena-hex absolute inset-[14%] border border-dashed" style={{ borderColor: theme.color, opacity: 0.55 }} />
                        <div
                          className="absolute inset-[32%] rounded-full"
                          style={{ background: `radial-gradient(ellipse, ${theme.color}66, transparent 70%)`, border: `1px solid ${theme.color}`, opacity: 0.85 }}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {rest.length > 0 && (
                <div className="relative mt-10">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="text-xs font-extrabold tracking-[0.2em]" style={{ color: "#3AD6FF" }}>
                      02
                    </span>
                    <span className="text-xs font-extrabold tracking-[0.3em] uppercase" style={{ color: "#3AD6FF" }}>
                      {"// Hall of Elites"}
                    </span>
                    <div className="h-px flex-1" style={{ background: "linear-gradient(to right, rgba(61,214,255,0.5), transparent)" }} />
                  </div>

                  <div className="max-h-[560px] overflow-y-auto">
                    {rest.map((agent, i) => (
                      <motion.div
                        key={agent.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: 0.3 + i * 0.04 }}
                        className="flex items-center gap-3 border-b border-l-2 py-3 pl-3 sm:gap-4"
                        style={{ borderBottomColor: "rgba(255,255,255,0.08)", borderLeftColor: i % 2 === 0 ? "#3AD6FF" : "#FF3BA0" }}
                      >
                        <span className="w-8 shrink-0 text-center text-sm font-bold" style={{ color: "rgba(255,255,255,0.3)" }}>
                          {String(i + 4).padStart(2, "0")}
                        </span>
                        <Avatar url={agent.profileImageUrl} name={agent.name} sizeClassName="h-9 w-9 shrink-0" pixels={72} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold sm:text-base" style={{ color: TEXT }}>
                            {agent.name}
                          </p>
                          <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                            {agent.issuedCount} {agent.issuedCount === 1 ? "policy" : "policies"} {"//"}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-bold sm:text-base" style={{ color: "#3AD6FF" }}>
                            <AnimatedAP value={agent.issuedAP} />
                          </p>
                          <p className="text-[9px] font-bold tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.35)" }}>
                            Premium Written
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
