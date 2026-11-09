"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** The one card shape shared by all three levels of the training catalog
 *  (module grid, chapter grid, lesson breakdown) — an icon/cover header
 *  band, then a body with an optional description and a progress bar.
 *  Each level supplies its own icon and progress number; the lesson level
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
            className="h-full w-full"
            style={{
              backgroundImage:
                "linear-gradient(135deg, rgb(202 126 64 / 0.28) 0%, rgb(172 90 42 / 0.2) 45%, rgb(10 6 3 / 0.95) 100%)",
            }}
          />
        )}
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-0 flex items-center gap-3 p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-black/45 text-copper backdrop-blur-sm">
            {fallbackIcon}
          </div>
          <div className="min-w-0">
            <p className="font-condensed text-[9px] font-bold tracking-[0.18em] text-white/70 uppercase">
              {eyebrow}
            </p>
            <h3 className="font-condensed line-clamp-2 text-[13px] leading-tight font-extrabold text-white uppercase drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]">
              {title}
            </h3>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-3">
        {description ? (
          <p className="line-clamp-2 flex-1 text-xs text-muted">
            {description}
          </p>
        ) : (
          <div className="flex-1" />
        )}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/30">
          <div
            className={cn(
              "h-full rounded-full transition-[width]",
              clampedPct >= 100 ? "bg-green" : "bg-copper",
            )}
            style={{
              width: `${clampedPct > 0 ? Math.max(6, clampedPct) : 0}%`,
            }}
          />
        </div>
      </div>
    </Link>
  );
}
