"use client";

import { usePathname } from "next/navigation";
import { useWideLayout } from "@/lib/useWideLayout";

// Scripts and Commission Calculator render a full-bleed iframe that's meant
// to reach the actual edges of the browser window (so the embedded tool's
// own header/line span edge to edge on wide monitors) — the shared
// max-w-6xl reading-width wrapper every other page uses would otherwise cap
// the iframe at 1152px, centered, no matter how wide the screen is. Quoter
// gave this up once it got its own graphic PageHeading (see quoter/page.tsx)
// — that heading has to sit in the same centered column every other page's
// heading does, so the embed below it stays in that column too rather than
// suddenly bleeding to the viewport edges right under a centered title.
const FULL_BLEED_PREFIXES = ["/portal/scripts", "/portal/commission-calculator"];

export function ContentContainer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [wide] = useWideLayout();

  if (FULL_BLEED_PREFIXES.some((p) => pathname.startsWith(p))) {
    return <div className="h-full w-full">{children}</div>;
  }

  // Wide mode (opt-in, see Sidebar's toggle) trades the usual centered
  // reading width for something that actually uses a large/widescreen
  // monitor — wide tables (Agents, Book of Business) stop needing a
  // horizontal scrollbar to show their last couple of columns.
  return <div className={wide ? "mx-auto w-full max-w-[1800px]" : "mx-auto w-full max-w-6xl"}>{children}</div>;
}
