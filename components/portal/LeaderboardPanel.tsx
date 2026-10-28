"use client";

import { useEffect, useId, useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { useCountUp } from "@/lib/useCountUp";

const POLL_MS = 20000;

const PERIODS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "all", label: "All Time" },
] as const;
type Period = (typeof PERIODS)[number]["value"];

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

// Ambient "slot machine" effects layered over the whole stage, matching the
// reference template's always-on rain/party effects (not one-off triggers —
// the template defaults both props to true): coins bob in place near the
// edges, $100 bills rain down continuously, confetti streams over the top,
// and a few fireworks burst on a loop in the corners. All pointer-events
// none and clipped by the stage's overflow-hidden so they never affect
// layout or scroll.
const COINS = [
  { top: "6%", left: "4%", size: 36, delay: "0s" },
  { top: "16%", right: "5%", size: 28, delay: "-1.5s" },
  { top: "42%", left: "2%", size: 32, delay: "-3s" },
  { top: "55%", right: "3%", size: 24, delay: "-4.5s" },
  { top: "78%", left: "5%", size: 30, delay: "-2s" },
  { top: "88%", right: "4%", size: 26, delay: "-5s" },
  { top: "30%", right: "9%", size: 20, delay: "-3.8s" },
  { top: "65%", left: "9%", size: 22, delay: "-1.2s" },
] as const;

const BILLS = [
  { left: "5%", width: 56, duration: "9s", delay: "-1s" },
  { left: "20%", width: 42, duration: "11s", delay: "-4s" },
  { left: "35%", width: 58, duration: "10s", delay: "-7s" },
  { left: "50%", width: 46, duration: "12s", delay: "-2.5s" },
  { left: "65%", width: 54, duration: "9.5s", delay: "-6s" },
  { left: "80%", width: 44, duration: "10.5s", delay: "-3s" },
  { left: "93%", width: 50, duration: "11.5s", delay: "-8s" },
] as const;

const CONFETTI = [
  { left: "2%", w: 10, h: 6, color: "#FFD23F", duration: "7s", delay: "-1s", round: false },
  { left: "8%", w: 8, h: 8, color: "#FF3B6B", duration: "8.5s", delay: "-5s", round: true },
  { left: "14%", w: 7, h: 11, color: "#3AD6FF", duration: "6.5s", delay: "-3s", round: false },
  { left: "20%", w: 9, h: 9, color: "#6CFF8A", duration: "9s", delay: "-7s", round: true },
  { left: "26%", w: 11, h: 6, color: "#FFFFFF", duration: "7.5s", delay: "-2s", round: false },
  { left: "32%", w: 8, h: 8, color: "#FF7A1A", duration: "8s", delay: "-6s", round: true },
  { left: "38%", w: 10, h: 6, color: "#B46CFF", duration: "9.5s", delay: "-4s", round: false },
  { left: "44%", w: 7, h: 11, color: "#FFD23F", duration: "6.5s", delay: "-8s", round: false },
  { left: "50%", w: 9, h: 9, color: "#3AD6FF", duration: "8s", delay: "-1.5s", round: true },
  { left: "56%", w: 8, h: 10, color: "#FF3B6B", duration: "7s", delay: "-5.5s", round: false },
  { left: "62%", w: 9, h: 9, color: "#6CFF8A", duration: "9s", delay: "-3.5s", round: true },
  { left: "68%", w: 10, h: 6, color: "#FF7A1A", duration: "7.5s", delay: "-7.5s", round: false },
  { left: "74%", w: 8, h: 9, color: "#B46CFF", duration: "8.5s", delay: "-2.5s", round: true },
  { left: "80%", w: 10, h: 6, color: "#FFD23F", duration: "6.5s", delay: "-6.5s", round: false },
  { left: "86%", w: 9, h: 9, color: "#3AD6FF", duration: "9s", delay: "-4.5s", round: true },
  { left: "92%", w: 8, h: 10, color: "#6CFF8A", duration: "7.5s", delay: "-0.5s", round: false },
  { left: "97%", w: 9, h: 9, color: "#FFFFFF", duration: "8s", delay: "-8.5s", round: true },
] as const;

const FIREWORKS = [
  { top: "6%", left: "10%", color: "#FFD23F", delay: "0s", scale: 1 },
  { top: "4%", left: "35%", color: "#3AD6FF", delay: "-1.1s", scale: 0.8 },
  { top: "7%", left: "55%", color: "#FF7A1A", delay: "-2.2s", scale: 1.1 },
  { top: "4%", left: "75%", color: "#6CFF8A", delay: "-0.6s", scale: 0.85 },
  { top: "8%", left: "90%", color: "#FF3B6B", delay: "-1.7s", scale: 0.95 },
] as const;

// Multi-stop radial gradient + an embossed "$" (dark offset behind a bright
// face) for a dimensional, coin-like shine instead of a flat gold circle.
// Each instance gets its own gradient id via useId — reusing one fixed id
// across several rendered coins would collide (SVG `url(#id)` references
// resolve document-wide, not scoped per <svg>).
function CoinIcon({ size }: { size: number }) {
  const uid = useId();
  const gradId = `lb-coin-${uid}`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <radialGradient id={gradId} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#FFF6D0" />
          <stop offset="35%" stopColor="#FFD75E" />
          <stop offset="70%" stopColor="#E8A317" />
          <stop offset="100%" stopColor="#8A5A00" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="47" fill={`url(#${gradId})`} stroke="#6B4300" strokeWidth="1.5" />
      <circle cx="50" cy="50" r="47" fill="none" stroke="#FFE9A8" strokeWidth="2.5" strokeDasharray="8 6" opacity="0.8" />
      <circle cx="50" cy="50" r="34" fill="none" stroke="#8A5A00" strokeWidth="2" opacity="0.6" />
      <circle cx="50" cy="50" r="31" fill="none" stroke="#FFE9A8" strokeWidth="1.5" opacity="0.7" />
      <path d="M22 28 A34 34 0 0 1 60 17" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" opacity="0.45" />
      <text x="51" y="65" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="bold" fontSize="42" fill="#5E3B00" opacity="0.6">
        $
      </text>
      <text x="50" y="63" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="bold" fontSize="42" fill="#FFF8E0" stroke="#8A5200" strokeWidth="0.8">
        $
      </text>
    </svg>
  );
}

function BillIcon({ width }: { width: number }) {
  const height = (width * 110) / 260;
  return (
    <svg width={width} height={height} viewBox="0 0 260 110" aria-hidden="true">
      <rect x="1" y="1" width="258" height="108" rx="6" fill="#A9D3A0" stroke="#3E6B4E" strokeWidth="2" />
      <rect x="10" y="10" width="240" height="90" rx="3" fill="none" stroke="#5E8A68" strokeWidth="1.5" strokeDasharray="2 3" />
      <ellipse cx="130" cy="55" rx="28" ry="36" fill="#86BD7E" stroke="#3E6B4E" strokeWidth="2" />
      <circle cx="130" cy="45" r="10" fill="#4E6E57" />
      <text x="20" y="34" fontFamily="Georgia, serif" fontWeight="bold" fontSize="20" fill="#2F5340">
        100
      </text>
      <text x="240" y="34" textAnchor="end" fontFamily="Georgia, serif" fontWeight="bold" fontSize="20" fill="#2F5340">
        100
      </text>
      <text x="20" y="92" fontFamily="Georgia, serif" fontWeight="bold" fontSize="20" fill="#2F5340">
        100
      </text>
      <text x="240" y="92" textAnchor="end" fontFamily="Georgia, serif" fontWeight="bold" fontSize="20" fill="#2F5340">
        100
      </text>
    </svg>
  );
}

// Flash + 16 radiating sparks for a fuller jackpot-style burst — the
// nth-child angle rules live in globals.css since CSS custom properties set
// per-child can't be expressed as inline style on a mapped array cleanly.
function Firework({ color, top, left, delay, scale }: { color: string; top: string; left: string; delay: string; scale: number }) {
  return (
    <span
      className="leaderboard-firework absolute"
      style={{ color, top, left, animationDelay: delay, transform: `scale(${scale})` }}
      aria-hidden="true"
    >
      {Array.from({ length: 16 }, (_, i) => (
        <i key={i} />
      ))}
    </span>
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
  const [period, setPeriod] = useState<Period>("all");
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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

  const top3: PodiumSlot[] = Array.from({ length: 3 }, (_, i) => rankings[i] ?? { id: `empty-${i}`, placeholder: true });
  const rest = rankings.slice(3);

  return (
    <div className="space-y-10">
      <div>
        {/* The "stage" — same radial copper-on-near-black gradient as the
            reference template, covering the WHOLE leaderboard (title, period
            tabs, podium, and the rest-of-the-pack list below it), always
            rendered regardless of load state so the marquee header and
            ambient effects are never hidden behind a bare loading line. */}
        <div
          className="relative overflow-hidden rounded-2xl px-3 pt-8 pb-6 sm:px-12"
          style={{ background: "radial-gradient(ellipse 70% 90% at 50% 10%, #7A2E05 0%, #2E1204 45%, #0D0603 100%)" }}
        >
          {/* Ambient layer: coins bobbing near the edges + corner
              fireworks, sitting behind everything else in DOM order. */}
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            {COINS.map((coin, i) => (
              <span
                key={i}
                className="leaderboard-coin-float absolute"
                style={{
                  top: coin.top,
                  left: "left" in coin ? coin.left : undefined,
                  right: "right" in coin ? coin.right : undefined,
                  animationDelay: coin.delay,
                }}
              >
                <CoinIcon size={coin.size} />
              </span>
            ))}
            {FIREWORKS.map((fw, i) => (
              <Firework key={i} color={fw.color} top={fw.top} left={fw.left} delay={fw.delay} scale={fw.scale} />
            ))}
          </div>

          {/* Marquee header — big neon title with chase-light bulb strips
              and the pulsing "live" dot, plus the period tabs. Matches the
              reference template's header exactly, and stays up regardless
              of load state since it's the stage's own persistent chrome. */}
          <div className="relative flex flex-col items-center gap-3 pb-6">
            <div className="leaderboard-bulbs h-2 w-full max-w-[640px] rounded-full" />
            <div className="flex items-center gap-3 sm:gap-4">
              <span
                className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full sm:h-3.5 sm:w-3.5"
                style={{ background: "#FF3B30", boxShadow: "0 0 22px #FF3B30" }}
              />
              <h1
                className="font-bungee text-center text-xl leading-none sm:text-4xl"
                style={{ color: "#FFFFFF", textShadow: "0 0 18px #FF7A1A, 0 0 42px #FF4D00, 0 4px 0 #5A1E00" }}
              >
                LIVE LEADERBOARD
              </h1>
            </div>
            <div className="leaderboard-bulbs h-2 w-full max-w-[640px] rounded-full" style={{ animationDirection: "reverse" }} />

            <div
              role="tablist"
              aria-label="Leaderboard period"
              className="mt-2 flex gap-1 rounded-full p-1 sm:gap-1.5 sm:p-1.5"
              style={{ background: "rgba(30,12,4,0.85)", border: "1px solid #8A4A1E", boxShadow: "0 0 24px rgba(255,122,26,0.3)" }}
            >
              {PERIODS.map((p) => {
                const active = period === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setPeriod(p.value)}
                    className="rounded-full px-3 py-1.5 text-[11px] font-bold tracking-wide uppercase transition-colors sm:px-4 sm:text-sm"
                    style={
                      active
                        ? { background: "linear-gradient(180deg, #FF9A4D, #FF7A1A)", color: "#2E1204", boxShadow: "0 0 16px rgba(255,138,42,0.6)" }
                        : { color: "#E0B48C" }
                    }
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
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
            </>
          )}

          {/* Front layer: confetti streaming down + $100 bills raining —
              always on (not gated by load state) like the coins/fireworks
              above, stacked above everything else by DOM order (no z-index
              needed, since stacking context is the stage's own). */}
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            {CONFETTI.map((c, i) => (
              <span
                key={i}
                className="leaderboard-confetti absolute"
                style={{
                  left: c.left,
                  width: c.w,
                  height: c.h,
                  background: c.color,
                  borderRadius: c.round ? "50%" : 2,
                  animationDuration: c.duration,
                  animationDelay: c.delay,
                }}
              />
            ))}
            {BILLS.map((bill, i) => (
              <span
                key={i}
                className="leaderboard-bill absolute opacity-50"
                style={{ left: bill.left, animationDuration: bill.duration, animationDelay: bill.delay }}
              >
                <BillIcon width={bill.width} />
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
