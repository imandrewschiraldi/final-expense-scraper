"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

// A small ring over the corner of the cover image, not a bar taking up
// body space — it reads as "progress" at a glance without covering any
// more of the thumbnail than its own small footprint.
function ProgressRing({ pct }: { pct: number }) {
  const size = 32;
  const stroke = 3;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div
      className="relative shrink-0 rounded-full bg-black/55 backdrop-blur-sm"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          fill="none"
          className="stroke-white/20"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn(
            "transition-[stroke-dashoffset] duration-300",
            pct >= 100 ? "stroke-green" : "stroke-copper",
          )}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white">
        {pct}%
      </span>
    </div>
  );
}

/** The one card shape shared by all three levels of the training catalog
 *  (module grid, chapter grid, lesson breakdown) — a cover image left
 *  untouched by any overlay except a small progress ring in its corner,
 *  then a body holding the eyebrow, title, and an optional description.
 *  Each level supplies its own icon (shown centered only when there's no
 *  cover photo to fall back on) and progress number; the lesson level
 *  just passes 0 or 100 since a single lesson has no partial state. */
export function TrainingTile({
  href,
  eyebrow,
  title,
  description,
  pct,
  coverUrl,
  fallbackIcon,
}: {
  href: string;
  eyebrow: string;
  title: string;
  description?: string | null;
  pct: number;
  coverUrl?: string | null;
  fallbackIcon: ReactNode;
}) {
  const clampedPct = Math.min(100, Math.max(0, pct));

  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface2 transition-all hover:-translate-y-0.5 hover:border-copper-dim-gradient hover:shadow-[0_10px_24px_-12px_rgba(0,0,0,0.6)]"
    >
      <div className="relative h-24 w-full shrink-0 overflow-hidden">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{
              backgroundImage:
                "linear-gradient(135deg, rgb(202 126 64 / 0.28) 0%, rgb(172 90 42 / 0.2) 45%, rgb(10 6 3 / 0.95) 100%)",
            }}
          >
            <div className="text-white/25">{fallbackIcon}</div>
          </div>
        )}
        <div className="absolute top-1.5 right-1.5">
          <ProgressRing pct={clampedPct} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="font-condensed text-[9px] font-bold tracking-[0.18em] text-muted uppercase">
          {eyebrow}
        </p>
        <h3 className="font-condensed line-clamp-2 text-[13px] leading-tight font-extrabold text-white uppercase">
          {title}
        </h3>
        {description && (
          <p className="line-clamp-2 text-xs text-muted">{description}</p>
        )}
      </div>
    </Link>
  );
}
