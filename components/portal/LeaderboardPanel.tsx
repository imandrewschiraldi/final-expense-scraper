"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { Radio } from "lucide-react";
import { cn } from "@/lib/cn";
import { useCountUp } from "@/lib/useCountUp";

const POLL_MS = 20000;

type Ranking = { id: string; name: string; profileImageUrl: string | null; issuedAP: number; issuedCount: number };
type PodiumSlot = Ranking | { id: string; placeholder: true };

function formatAP(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

// This whole card is a fixed dark "stage" by design (see the wrapper below)
// regardless of the site's light/dark toggle — only the page behind it
// changes with theme. So every color in this file is a literal value, not
// a theme token: bare Tailwind color names like `white`/`muted`/`border`
// resolve to this app's theme-remapped tokens (app/globals.css redefines
// them per light/dark), which would make text go dark-on-dark here in
// light mode. `[#ffffff]` etc. opt out of that remap.
const WHITE = "text-[#ffffff]";
const WHITE_DIM = "text-[#ffffff]/90";
const MUTED = "text-[#9c96ab]";

// Flat saturated purple/red/orange blocks, matching the reference's own
// glossy-toy palette — deliberately NOT the app's usual brushed-metal
// .metal-*-surface treatment (that's a diagonal 5-stop gradient + grain
// texture meant for small badges/icon tiles; at podium-block size it reads
// as a textured smudge instead of the clean glossy color field the
// reference has), so these are their own simple top-to-bottom gradients,
// one-off to this component.
const RANK_THEME = [
  {
    order: "md:order-2",
    top: "#c084fc",
    base: "#9333ea",
    bottom: "#6b21a8",
    cap: "#e9d5ff",
    glow: "#a855f7",
    ordinal: "1ST",
    height: "h-28 sm:h-44",
    avatarSize: "h-16 w-16 sm:h-28 sm:w-28",
    avatarPixels: 224,
    crownSize: "h-12 w-12 sm:h-20 sm:w-20",
    crown: { src: "/crowns/crown-1st.png", width: 197, height: 177 },
    delay: 0.3,
  },
  {
    order: "md:order-1",
    top: "#fb7185",
    base: "#e11d48",
    bottom: "#9f1239",
    cap: "#fecdd3",
    glow: "#f43f5e",
    ordinal: "2ND",
    height: "h-20 sm:h-32",
    avatarSize: "h-13 w-13 sm:h-20 sm:w-20",
    avatarPixels: 160,
    crownSize: "h-9 w-9 sm:h-14 sm:w-14",
    crown: { src: "/crowns/crown-2nd.png", width: 197, height: 176 },
    delay: 0.1,
  },
  {
    order: "md:order-3",
    top: "#fb923c",
    base: "#ea580c",
    bottom: "#9a3412",
    cap: "#fed7aa",
    glow: "#f97316",
    ordinal: "3RD",
    height: "h-14 sm:h-24",
    avatarSize: "h-13 w-13 sm:h-20 sm:w-20",
    avatarPixels: 160,
    crownSize: "h-9 w-9 sm:h-14 sm:w-14",
    crown: { src: "/crowns/crown-3rd.png", width: 197, height: 190 },
    delay: 0.18,
  },
] as const;

function AnimatedAP({ value, className }: { value: number; className?: string }) {
  const animated = useCountUp(value);
  return <span className={className}>{formatAP(animated ?? 0)}</span>;
}

// `pixels` drives next/image's actual optimized output size (2x the
// biggest on-screen size it's used at, for retina) — a plain <img> here
// would just hand the browser whatever resolution was originally uploaded
// and let it naively scale that, which is what was reading as blurry at
// the podium's larger avatar sizes.
function Avatar({ url, name, sizeClassName, pixels = 96 }: { url: string | null; name: string; sizeClassName: string; pixels?: number }) {
  return url ? (
    <Image
      src={url}
      alt=""
      width={pixels}
      height={pixels}
      quality={90}
      className={cn("shrink-0 rounded-full object-cover", sizeClassName)}
    />
  ) : (
    <div className={cn("flex shrink-0 items-center justify-center rounded-full bg-[#ffffff]/10 text-base font-bold sm:text-xl", WHITE, sizeClassName)}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// A pointed lens/feather shape (two bezier curves meeting at both ends),
// drawn pointing along +X from the origin.
function leafPath(length: number, width: number) {
  const hw = width / 2;
  return `M0,0 Q${length * 0.32},${-hw} ${length},0 Q${length * 0.32},${hw} 0,0`;
}

// A wing-shaped crest flanking the podium (lucide has no wreath/feather
// icon): every feather fans out from ONE base point across a wide angle,
// with feather length following a bell curve — short at both ends of the
// fan, longest in the upper-middle — which is what actually produces a
// curved wing silhouette, verified by screenshotting a standalone render
// of this (an earlier spine-of-leaves version just looked like a thin
// stick with blobs, not a crest). `flip` mirrors it for the right side.
function LaurelBranch({ flip }: { flip?: boolean }) {
  const count = 11;
  const baseX = 16;
  const baseY = 220;
  const startAngle = -4; // near-horizontal, pointing outward
  const endAngle = -132; // curling up and back over the top
  const feathers = Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1); // 0..1 across the fan
    const angle = startAngle + (endAngle - startAngle) * t;
    const bell = Math.sin(t * Math.PI); // 0 at both ends, 1 in the middle
    const length = 40 + bell * 96;
    const width = 11 + bell * 18;
    return { angle, length, width };
  });

  return (
    <svg
      viewBox="0 0 150 240"
      className={cn("h-56 w-auto drop-shadow-[0_0_24px_rgba(234,88,12,0.45)] sm:h-80", flip && "-scale-x-100")}
      aria-hidden="true"
    >
      <defs>
        {/* userSpaceOnUse, not the default objectBoundingBox — each
            feather is its own tiny rotated shape, so a per-shape gradient
            would cycle through the whole color range inside every single
            feather instead of sweeping once across the whole crest. Fixed
            coordinates in the same space the feathers are placed in (the
            <g> below) make the color depend on actual position: dark
            orange near the base, gold out at the tips. */}
        <linearGradient id="laurelGradient" gradientUnits="userSpaceOnUse" x1={baseX} y1={baseY} x2={baseX + 110} y2={baseY - 180}>
          <stop offset="0%" stopColor="#9a3412" />
          <stop offset="30%" stopColor="var(--gold-metal-dk)" />
          <stop offset="65%" stopColor="var(--gold)" />
          <stop offset="100%" stopColor="var(--gold-metal-hi)" />
        </linearGradient>
      </defs>
      <g transform={`translate(${baseX} ${baseY})`}>
        {feathers.map((f, i) => (
          <path
            key={i}
            d={leafPath(f.length, f.width)}
            transform={`rotate(${f.angle})`}
            fill="url(#laurelGradient)"
            stroke="var(--gold-metal-dk)"
            strokeWidth="0.75"
          />
        ))}
      </g>
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
          // The "stage" — a fixed dark backdrop with a violet glow rising
          // from center, covering the WHOLE leaderboard (podium and the
          // rest-of-the-pack list below it), not just the top 3. It's a
          // deliberately fixed look regardless of the site's light/dark
          // toggle — see the WHITE/MUTED constants' comment above — only
          // the page behind this card is meant to change with theme.
          // No overflow-hidden here — the crests below are positioned to
          // intentionally spill past this box's left/right edges (see
          // LaurelBranch's own comment); clipping happens lower down, only
          // around the rest-of-the-pack list, which has no reason to spill.
          <div className="relative rounded-2xl bg-[radial-gradient(120%_90%_at_50%_0%,rgba(139,92,246,0.22),transparent_65%),linear-gradient(180deg,#0c0714_0%,#050309_100%)]">
            <div className="relative px-3 pt-10 pb-0 sm:px-12 sm:pt-16">
              <div className="relative flex flex-row items-end justify-center gap-2 sm:gap-10">
                {/* Side crests — desktop/tablet only, no room on a phone-width card. */}
                <div className="pointer-events-none absolute inset-y-0 -left-4 hidden items-end pb-2 sm:-left-10 sm:flex sm:pb-8">
                  <LaurelBranch />
                </div>
                <div className="pointer-events-none absolute inset-y-0 -right-4 hidden items-end pb-2 sm:-right-10 sm:flex sm:pb-8">
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
                      {/* Spotlight glow sitting behind the crown/name/avatar
                          cluster — the "arcade stage light" the dark
                          backdrop above is lit by. Inline style, not a
                          Tailwind arbitrary-value class — RANK_THEME's
                          colors are runtime values, and Tailwind's scanner
                          only picks up class names that appear literally in
                          source, not ones built via template interpolation. */}
                      <div
                        className="pointer-events-none absolute -top-4 h-24 w-24 rounded-full opacity-35 blur-2xl sm:h-32 sm:w-32"
                        style={{ backgroundColor: theme.glow }}
                      />

                      {!isPlaceholder && (
                        <>
                          <motion.div
                            initial={{ opacity: 0, scale: 0.4, rotate: -16 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            transition={{ delay: theme.delay + 0.25, type: "spring", stiffness: 280, damping: 14 }}
                            className="relative z-10 drop-shadow-[0_3px_10px_rgba(0,0,0,0.6)]"
                          >
                            <Image
                              src={theme.crown.src}
                              alt=""
                              width={theme.crown.width}
                              height={theme.crown.height}
                              className={cn("w-auto object-contain", theme.crownSize)}
                            />
                          </motion.div>
                          <span className={cn("relative z-10 mt-1 w-full truncate px-1 text-center text-[10px] font-bold tracking-[0.04em] uppercase sm:text-xs", WHITE_DIM)}>
                            {agent.name}
                          </span>
                        </>
                      )}

                      <div
                        className="relative z-10 mt-1 -mb-4 rounded-full p-[3px] sm:-mb-6"
                        style={{ backgroundColor: theme.base }}
                      >
                        {isPlaceholder ? (
                          <div
                            className={cn(
                              "flex items-center justify-center rounded-full border-2 border-dashed border-[#ffffff]/20 bg-[#ffffff]/5",
                              MUTED,
                              theme.avatarSize,
                            )}
                          >
                            —
                          </div>
                        ) : (
                          <Avatar
                            url={agent.profileImageUrl}
                            name={agent.name}
                            sizeClassName={theme.avatarSize}
                            pixels={theme.avatarPixels}
                          />
                        )}
                      </div>

                      {/* The pillar itself — height differs by rank, giving
                          the classic 1st-tallest podium silhouette. The
                          avatar above overlaps its top edge (-mb- above)
                          like a figure standing on the block. Flat 2-stop
                          color (not the metallic badge system — see
                          RANK_THEME's own comment) plus a lighter cap band
                          for a cheap stand-in for a lit 3D top face. */}
                      <div
                        className={cn(
                          "relative z-0 flex w-full flex-col items-center justify-center gap-1.5 overflow-hidden rounded-2xl pt-5 pb-3 shadow-[0_14px_30px_-10px_rgba(0,0,0,0.65)] sm:gap-2 sm:rounded-3xl sm:pt-7 sm:pb-4",
                          theme.height,
                        )}
                        style={{ backgroundImage: `linear-gradient(180deg, ${theme.top} 0%, ${theme.base} 55%, ${theme.bottom} 100%)` }}
                      >
                        <div className="absolute inset-x-0 top-0 h-3 sm:h-4" style={{ backgroundColor: theme.cap }} />

                        <span className={cn("font-podium relative text-2xl font-extrabold drop-shadow-[0_2px_2px_rgba(0,0,0,0.4)] sm:text-5xl", WHITE)}>
                          {theme.ordinal}
                        </span>

                        <span className={cn("relative rounded-full bg-black/25 px-2.5 py-1 text-[10px] font-bold sm:px-3 sm:py-1.5 sm:text-sm", WHITE)}>
                          <AnimatedAP value={isPlaceholder ? 0 : agent.issuedAP} className="font-scoreboard" />
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {rest.length > 0 && (
              <div className="relative mt-8 max-h-[560px] overflow-y-auto border-t border-[#ffffff]/10 pb-2">
                {rest.map((agent, i) => (
                  <motion.div
                    key={agent.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 + i * 0.04 }}
                    className="flex items-center gap-4 border-b border-[#ffffff]/10 px-4 py-3 text-sm last:border-b-0 hover:bg-[#ffffff]/5"
                  >
                    <span className={cn("font-scoreboard w-8 shrink-0", MUTED)}>#{i + 4}</span>
                    <Avatar
                      url={agent.profileImageUrl}
                      name={agent.name}
                      sizeClassName="h-7 w-7 border-2 border-copper-dim-gradient"
                      pixels={56}
                    />
                    <span className={cn("min-w-0 flex-1 truncate", WHITE)}>{agent.name}</span>
                    <AnimatedAP value={agent.issuedAP} className="metal-copper-text font-scoreboard shrink-0" />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
