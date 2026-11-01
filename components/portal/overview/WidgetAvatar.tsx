import Image from "next/image";
import { cn } from "@/lib/cn";
import { optimizableImageUrl } from "@/lib/profileImage";
import { COMPANY_MARK_URL } from "@/lib/chat";

/** Shared avatar for Overview's mini widgets (Team Chat, Leaderboard) —
 *  profile picture when there is one (and it's a Blob URL next/image can
 *  actually optimize), falling back to the monogram circle otherwise. The
 *  company mark (admin/Sales Bot messages, see COMPANY_MARK_URL) is a
 *  local /public asset rather than a Blob URL, and needs to stay fully
 *  visible rather than be cropped to fill the circle, so it gets its own
 *  case — same treatment as the full Team Chat page's MessageAvatar. */
export function WidgetAvatar({ url, name, sizeClassName }: { url: string | null; name: string; sizeClassName: string }) {
  if (url === COMPANY_MARK_URL) {
    return (
      <div className={cn("flex shrink-0 items-center justify-center rounded-full border border-border bg-surface2 p-1", sizeClassName)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" className="h-full w-full object-contain" />
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
