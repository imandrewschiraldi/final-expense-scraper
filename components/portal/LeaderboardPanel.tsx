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

// Matches a reference template (sent as an .html mock) almost exactly —
// colors, the crown/laurel SVGs, and the layout below are pulled straight
// from it rather than approximated from a screenshot. This whole card is a
// fixed dark "stage" by design, regardless of the site's light/dark toggle
// (only the page behind it changes with theme), so every color here is a
// literal value, not a theme token — bare Tailwind color names like
// `white`/`muted`/`border` resolve to this app's theme-remapped tokens
// (app/globals.css redefines them per light/dark), which would make text
// go dark-on-dark here in light mode.
const TEXT = "#F3EEFF";

const RANK_THEME = [
  {
    // 1st — the one rank that gets a distinctly brighter copper pillar +
    // pulsing glow (see .leaderboard-pillar-glow in globals.css).
    order: "md:order-2",
    pillarTop: "#B5480E",
    pillarBottom: "#4A1A05",
    pillarBorder: "#FF9A4D",
    avatarRing: "#FFD23F",
    avatarGlow: "rgba(255,210,63,0.7)",
    crownColor: "#F2B21E",
    crownGlow: "rgba(255,200,40,0.8)",
    chipBg: "rgba(255,210,63,0.16)",
    chipBorder: "#FFD23F",
    chipText: "#FFE89A",
    numberColor: "#FFE27A",
    numberGlow: "#FFB800",
    laurelColor: "#FFD23F",
    numeral: "1",
    width: "max-w-[168px]",
    height: "h-28 sm:h-44",
    avatarSize: "h-16 w-16 sm:h-28 sm:w-28",
    avatarPixels: 224,
    crownSize: "h-9 w-9 sm:h-14 sm:w-14",
    numberSize: "text-xl sm:text-4xl",
    delay: 0.3,
  },
  {
    // 2nd and 3rd share the same muted copper-brown pillar and orange AP
    // chip in the reference — only the crown/avatar-ring/number color
    // (silver vs bronze) tells them apart, not the block itself.
    order: "md:order-1",
    pillarTop: "#5A2A10",
    pillarBottom: "#2A1206",
    pillarBorder: "#A8663A",
    avatarRing: "#C9D3E6",
    avatarGlow: "rgba(201,211,230,0.55)",
    crownColor: "#BFC8D9",
    crownGlow: "rgba(201,211,230,0.7)",
    chipBg: "rgba(255,140,40,0.18)",
    chipBorder: "#FF8A2A",
    chipText: "#FFD9B0",
    numberColor: "#E7ECF7",
    numberGlow: "#C9D3E6",
    laurelColor: "#C9D3E6",
    numeral: "2",
    width: "max-w-[146px]",
    height: "h-20 sm:h-32",
    avatarSize: "h-13 w-13 sm:h-20 sm:w-20",
    avatarPixels: 160,
    crownSize: "h-7 w-7 sm:h-10 sm:w-10",
    numberSize: "text-lg sm:text-3xl",
    delay: 0.1,
  },
  {
    order: "md:order-3",
    pillarTop: "#5A2A10",
    pillarBottom: "#2A1206",
    pillarBorder: "#A8663A",
    avatarRing: "#E08A4B",
    avatarGlow: "rgba(224,138,75,0.55)",
    crownColor: "#C9783E",
    crownGlow: "rgba(224,138,75,0.7)",
    chipBg: "rgba(255,140,40,0.18)",
    chipBorder: "#FF8A2A",
    chipText: "#FFD9B0",
    numberColor: "#F7B987",
    numberGlow: "#E08A4B",
    laurelColor: "#E08A4B",
    numeral: "3",
    width: "max-w-[146px]",
    height: "h-14 sm:h-24",
    avatarSize: "h-13 w-13 sm:h-20 sm:w-20",
    avatarPixels: 160,
    crownSize: "h-7 w-7 sm:h-10 sm:w-10",
    numberSize: "text-base sm:text-2xl",
    delay: 0.18,
  },
] as const;

// Small twinkling stars scattered around the #1 spot only, matching the
// reference template's update. Positions/colors/delays copied from it.
const STARS = [
  { size: 18, color: "#FFE27A", top: "4%", left: "14%", delay: "0s" },
  { size: 13, color: "#FFFFFF", top: "1%", right: "16%", delay: "-0.6s" },
  { size: 15, color: "#FFD23F", top: "34%", right: "8%", delay: "-1.2s" },
  { size: 11, color: "#FFFFFF", top: "40%", left: "8%", delay: "-0.9s" },
] as const;

function StarIcon({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill={color} aria-hidden="true">
      <path d="M20 0 C22 14 26 18 40 20 C26 22 22 26 20 40 C18 26 14 22 0 20 C14 18 18 14 20 0 Z" />
    </svg>
  );
}

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
    <div
      className={cn("flex shrink-0 items-center justify-center rounded-full text-base font-bold sm:text-xl", sizeClassName)}
      style={{ backgroundColor: "#2E1408", color: TEXT }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// Flat vector crown — same paths as the reference template's <symbol
// id="lbCrown">, recolored per rank via currentColor plus a fixed glossy
// sheen gradient overlay. Gem/pearl colors are fixed (red/blue/green,
// cream pearls) same as the template, regardless of rank.
function CrownIcon({ color, className }: { color: string; className?: string }) {
  const gradientId = "lbSheen";
  return (
    <svg viewBox="0 0 120 84" className={className} style={{ color }} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.6" />
          <stop offset="0.45" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      <path d="M14 62 L8 24 Q22 34 34 40 Q44 24 60 10 Q76 24 86 40 Q98 34 112 24 L106 62 Z" fill="currentColor" />
      <path d="M14 62 L8 24 Q22 34 34 40 Q44 24 60 10 Q76 24 86 40 Q98 34 112 24 L106 62 Z" fill={`url(#${gradientId})`} />
      <path
        d="M14 62 L8 24 Q22 34 34 40 Q44 24 60 10 Q76 24 86 40 Q98 34 112 24 L106 62 Z"
        fill="none"
        stroke="#000000"
        strokeOpacity="0.35"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M12 28 L16 58 M60 16 L60 30 M108 28 L104 58" stroke="#FFFFFF" strokeOpacity="0.45" strokeWidth="2" strokeLinecap="round" />
      <path d="M60 30 L68 40 L60 50 L52 40 Z" fill="#9EE7FF" stroke="#FFFFFF" strokeWidth="1.2" />
      <path d="M60 30 L64 40 L60 50 Z" fill="#FFFFFF" opacity="0.5" />
      <rect x="12" y="58" width="96" height="20" rx="3" fill="currentColor" />
      <rect x="12" y="58" width="96" height="20" rx="3" fill={`url(#${gradientId})`} />
      <rect x="12" y="58" width="96" height="20" rx="3" fill="none" stroke="#000000" strokeOpacity="0.35" strokeWidth="2" />
      <line x1="14" y1="61" x2="106" y2="61" stroke="#FFFFFF" strokeOpacity="0.5" strokeWidth="1.5" />
      <ellipse cx="34" cy="68" rx="6" ry="5" fill="#E0245E" stroke="#FFFFFF" strokeOpacity="0.7" strokeWidth="1" />
      <ellipse cx="60" cy="68" rx="7" ry="5.5" fill="#FF8A2A" stroke="#FFFFFF" strokeOpacity="0.7" strokeWidth="1" />
      <ellipse cx="86" cy="68" rx="6" ry="5" fill="#1FBF75" stroke="#FFFFFF" strokeOpacity="0.7" strokeWidth="1" />
      <circle cx="32" cy="66" r="1.6" fill="#FFFFFF" />
      <circle cx="58" cy="66" r="1.8" fill="#FFFFFF" />
      <circle cx="84" cy="66" r="1.6" fill="#FFFFFF" />
      <circle cx="8" cy="22" r="6" fill="#FFF6E0" stroke="#000000" strokeOpacity="0.25" />
      <circle cx="60" cy="8" r="7" fill="#FFF6E0" stroke="#000000" strokeOpacity="0.25" />
      <circle cx="112" cy="22" r="6" fill="#FFF6E0" stroke="#000000" strokeOpacity="0.25" />
      <circle cx="6" cy="20" r="2" fill="#FFFFFF" />
      <circle cx="58" cy="6" r="2.2" fill="#FFFFFF" />
      <circle cx="110" cy="20" r="2" fill="#FFFFFF" />
    </svg>
  );
}

// Classic symmetric laurel wreath — same paths as the reference template's
// <symbol id="lbLaurel">, sitting behind each pillar's rank numeral (not
// flanking the podium as big outer wings, which earlier attempts tried and
// never matched the template's actual, more compact design).
function LaurelIcon({
  color,
  className,
  style,
}: {
  color: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg viewBox="0 0 200 140" className={className} style={{ color, ...style }} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
        <path d="M70 128 C30 110 18 70 34 24" />
        <path d="M130 128 C170 110 182 70 166 24" />
      </g>
      <g fill="currentColor">
        <ellipse cx="34" cy="30" rx="7" ry="15" transform="rotate(-20 34 30)" />
        <ellipse cx="26" cy="56" rx="7" ry="15" transform="rotate(-40 26 56)" />
        <ellipse cx="28" cy="84" rx="7" ry="15" transform="rotate(-60 28 84)" />
        <ellipse cx="42" cy="108" rx="7" ry="15" transform="rotate(-78 42 108)" />
        <ellipse cx="166" cy="30" rx="7" ry="15" transform="rotate(20 166 30)" />
        <ellipse cx="174" cy="56" rx="7" ry="15" transform="rotate(40 174 56)" />
        <ellipse cx="172" cy="84" rx="7" ry="15" transform="rotate(60 172 84)" />
        <ellipse cx="158" cy="108" rx="7" ry="15" transform="rotate(78 158 108)" />
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
          // The "stage" — same radial copper-on-near-black gradient as the
          // reference template, covering the WHOLE leaderboard (podium and
          // the rest-of-the-pack list below it), not just the top 3.
          <div
            className="relative rounded-2xl px-3 pt-10 pb-6 sm:px-12 sm:pt-16"
            style={{ background: "radial-gradient(ellipse 70% 90% at 50% 10%, #7A2E05 0%, #2E1204 45%, #0D0603 100%)" }}
          >
            <div className="flex flex-row items-end justify-center gap-2 sm:gap-8">
              {top3.map((agent, i) => {
                const isPlaceholder = "placeholder" in agent;
                const theme = RANK_THEME[i];
                return (
                  <motion.div
                    key={agent.id}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: theme.delay, ease: "easeOut" }}
                    className={cn("relative flex min-w-0 flex-1 flex-col items-center", theme.order, theme.width, isPlaceholder && "opacity-40")}
                  >
                    {i === 0 &&
                      !isPlaceholder &&
                      STARS.map((star, si) => (
                        <span
                          key={si}
                          className="leaderboard-twinkle pointer-events-none absolute"
                          style={{ top: star.top, left: "left" in star ? star.left : undefined, right: "right" in star ? star.right : undefined, animationDelay: star.delay }}
                        >
                          <StarIcon color={star.color} size={star.size} />
                        </span>
                      ))}

                    {!isPlaceholder && (
                      <>
                        <motion.div
                          initial={{ opacity: 0, scale: 0.4, rotate: -16 }}
                          animate={{ opacity: 1, scale: 1, rotate: 0 }}
                          transition={{ delay: theme.delay + 0.25, type: "spring", stiffness: 280, damping: 14 }}
                          style={{ filter: `drop-shadow(0 0 12px ${theme.crownGlow})` }}
                        >
                          <CrownIcon color={theme.crownColor} className={cn("w-auto", theme.crownSize)} />
                        </motion.div>

                        <div
                          className={cn("mt-2 shrink-0 rounded-full", theme.avatarSize)}
                          style={{ boxShadow: `0 0 26px ${theme.avatarGlow}`, border: `4px solid ${theme.avatarRing}` }}
                        >
                          <Avatar url={agent.profileImageUrl} name={agent.name} sizeClassName="h-full w-full" pixels={theme.avatarPixels} />
                        </div>

                        <span className="mt-2 w-full truncate px-1 text-center text-sm font-bold sm:text-xl" style={{ color: TEXT }}>
                          {agent.name}
                        </span>
                        <span
                          className="mt-1 rounded-full px-3 py-1 text-xs font-bold sm:text-sm"
                          style={{ background: theme.chipBg, border: `1px solid ${theme.chipBorder}`, color: theme.chipText }}
                        >
                          <AnimatedAP value={agent.issuedAP} /> AP
                        </span>
                      </>
                    )}

                    {isPlaceholder && (
                      <div
                        className={cn("mt-2 flex shrink-0 items-center justify-center rounded-full border-2 border-dashed", theme.avatarSize)}
                        style={{ borderColor: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.4)" }}
                      >
                        —
                      </div>
                    )}

                    {/* The pillar — laurel watermark behind a big pixel-font
                        rank numeral, flat colored block with rounded top
                        corners / near-square bottom corners, matching the
                        reference template exactly. */}
                    <div
                      className={cn(
                        "relative mt-3 flex w-full items-center justify-center overflow-hidden sm:mt-4",
                        theme.height,
                        i === 0 && "leaderboard-pillar-glow",
                      )}
                      style={{
                        background: `linear-gradient(180deg, ${theme.pillarTop} 0%, ${theme.pillarBottom} 100%)`,
                        border: `1px solid ${theme.pillarBorder}`,
                        borderRadius: "16px 16px 6px 6px",
                        // 1st place's pulsing glow comes from the
                        // .leaderboard-pillar-glow CSS animation (see
                        // globals.css) — an inline boxShadow here would
                        // override it every render and freeze the pulse.
                        boxShadow: i === 0 ? undefined : "inset 0 2px 0 rgba(255,255,255,0.12)",
                      }}
                    >
                      <LaurelIcon
                        color={theme.laurelColor}
                        className="absolute h-[85%] w-auto opacity-90"
                        style={{ filter: `drop-shadow(0 0 10px ${theme.avatarGlow})` }}
                      />
                      <span
                        className={cn("font-pixel relative", theme.numberSize)}
                        style={{ color: theme.numberColor, textShadow: `0 0 14px ${theme.numberGlow}` }}
                      >
                        {theme.numeral}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {rest.length > 0 && (
              <div
                className="relative mt-8 max-h-[560px] overflow-y-auto rounded-2xl p-3 sm:p-4"
                style={{ background: "rgba(28,12,4,0.82)", border: "1px solid #7A3A12", boxShadow: "0 0 40px rgba(255,140,40,0.18)" }}
              >
                <div
                  className="grid gap-3 px-2 pb-2 text-[10px] font-bold tracking-[0.15em] uppercase sm:text-xs"
                  style={{ gridTemplateColumns: "40px minmax(0,1fr) 70px 90px", color: "#E0B48C" }}
                >
                  <div>Place</div>
                  <div>Agent</div>
                  <div>Policies</div>
                  <div>AP</div>
                </div>
                {rest.map((agent, i) => (
                  <motion.div
                    key={agent.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 + i * 0.04 }}
                    className="grid items-center gap-3 rounded-xl px-2 py-2.5 text-sm sm:px-3"
                    style={{ gridTemplateColumns: "40px minmax(0,1fr) 70px 90px", background: i % 2 === 0 ? "rgba(140,60,20,0.35)" : "rgba(100,40,12,0.25)" }}
                  >
                    <span className="font-pixel text-[11px]" style={{ color: "#FFB547" }}>
                      #{i + 4}
                    </span>
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Avatar url={agent.profileImageUrl} name={agent.name} sizeClassName="h-7 w-7 shrink-0" pixels={56} />
                      <span className="truncate font-semibold" style={{ color: TEXT }}>
                        {agent.name}
                      </span>
                    </div>
                    <span style={{ color: TEXT }}>{agent.issuedCount}</span>
                    <span className="flex items-center gap-1.5 font-bold" style={{ color: "#FFB547" }}>
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: "#FF8A2A", boxShadow: "0 0 8px #FF8A2A" }} />
                      <AnimatedAP value={agent.issuedAP} />
                    </span>
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
