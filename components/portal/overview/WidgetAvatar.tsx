import Image from "next/image";
import { cn } from "@/lib/cn";
import { optimizableImageUrl } from "@/lib/profileImage";

/** Shared avatar for Overview's mini widgets (Team Chat, Leaderboard) —
 *  profile picture when there is one (and it's a Blob URL next/image can
 *  actually optimize), falling back to the monogram circle otherwise. */
export function WidgetAvatar({ url, name, sizeClassName }: { url: string | null; name: string; sizeClassName: string }) {
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
