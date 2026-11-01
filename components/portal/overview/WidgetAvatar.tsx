"use client";

import Image from "next/image";
import { cn } from "@/lib/cn";
import { optimizableImageUrl } from "@/lib/profileImage";
import { resolveMarkImage } from "@/lib/chat";
import { useTheme } from "@/lib/useTheme";

/** Shared avatar for Overview's mini widgets (Team Chat, Leaderboard) —
 *  profile picture when there is one (and it's a Blob URL next/image can
 *  actually optimize), falling back to the monogram circle otherwise. The
 *  admin/Sales Bot marks (see resolveMarkImage) are local /public assets
 *  rather than Blob URLs, and need to stay fully visible rather than be
 *  cropped to fill the circle, so they get their own case — same
 *  treatment as the full Team Chat page's MessageAvatar. */
export function WidgetAvatar({ url, name, sizeClassName }: { url: string | null; name: string; sizeClassName: string }) {
  const [theme] = useTheme();
  const mark = resolveMarkImage(url, theme);
  if (mark) {
    return (
      <div className={cn("flex shrink-0 items-center justify-center rounded-full border border-border p-1", sizeClassName)} style={{ background: mark.bg }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mark.src} alt="" className="h-full w-full object-contain" />
      </div>
    );
  }
  const src = optimizableImageUrl(url);
  return src ? (
    <Image src={src} alt="" width={30} height={30} quality={90} className={cn("shrink-0 rounded-full border border-border object-cover", sizeClassName)} />
  ) : (
    <div
      className={cn(
        "font-condensed flex shrink-0 items-center justify-center rounded-full border border-border bg-surface2 font-bold text-muted",
        sizeClassName,
      )}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
