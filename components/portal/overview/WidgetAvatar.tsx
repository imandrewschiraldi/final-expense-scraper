"use client";

import Image from "next/image";
import { cn } from "@/lib/cn";
import { optimizableImageUrl } from "@/lib/profileImage";
import { chatInitials, markBackground } from "@/lib/chat";

/** Shared avatar for Overview's mini widgets (Team Chat, Leaderboard) —
 *  profile picture when there is one, falling back to the monogram circle
 *  otherwise. The admin/Sales Bot marks (see markBackground) are local
 *  /public assets rather than Blob URLs, and need to stay fully visible
 *  rather than be cropped to fill the circle, so they get their own case —
 *  same treatment as the full Team Chat page's MessageAvatar. A Blob URL
 *  (an agent's own uploaded photo) goes through next/image to optimize;
 *  any other https URL — a GroupMe member's own avatar, for instance,
 *  which next/image can't optimize without an allow-listed host — still
 *  renders, just as a plain <img>, same as MessageAvatar already does for
 *  every photo in the full Team Chat page. */
export function WidgetAvatar({
  url,
  name,
  sizeClassName,
}: {
  url: string | null;
  name: string;
  sizeClassName: string;
}) {
  const markBg = markBackground(url);
  if (markBg) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border",
          sizeClassName,
        )}
        style={{ background: markBg }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url!} alt="" className="h-full w-full object-contain" />
      </div>
    );
  }
  const optimizable = optimizableImageUrl(url);
  if (optimizable) {
    return (
      <Image
        src={optimizable}
        alt=""
        width={30}
        height={30}
        quality={90}
        className={cn(
          "shrink-0 rounded-full border border-border object-cover",
          sizeClassName,
        )}
      />
    );
  }
  if (url && url.startsWith("https://")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        className={cn(
          "shrink-0 rounded-full border border-border object-cover",
          sizeClassName,
        )}
      />
    );
  }
  return (
    <div
      className={cn(
        "font-condensed flex shrink-0 items-center justify-center rounded-full border border-border bg-surface2 font-bold text-muted",
        sizeClassName,
      )}
    >
      {chatInitials(name)}
    </div>
  );
}
