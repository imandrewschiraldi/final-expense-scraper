"use client";

import { usePathname } from "next/navigation";
import { isFullBleedRoute } from "@/lib/fullBleedRoutes";

// Every other page fills whatever width the browser window actually is — a
// 34" monitor gets a 34" page, same as any other dashboard-style app — with
// just main's own small fixed gutter on each side (or, with the overlay-card
// beta on, the card's own matching gutter — see AppShell, which skips both
// the card and its gutter on the full-bleed routes below). This replaced an
// opt-in "wide mode" that capped out at 1800px even turned on, and defaulted
// to a 1152px centered column otherwise: both left large stretches of a wide
// monitor empty no matter what. No padding here — main/the card already
// provides it.
//
// Scripts and Commission Calculator are the exception: they render a
// full-bleed iframe that's meant to reach the actual edges of the browser
// window (so the embedded tool's own header/line span edge to edge) —
// EmbeddedTool cancels out whichever single gutter AppShell puts around it
// with matching negative margins, which only works if this wrapper itself
// adds no padding of its own on top of that.
export function ContentContainer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (isFullBleedRoute(pathname)) {
    return <div className="h-full w-full">{children}</div>;
  }

  return <div className="w-full">{children}</div>;
}
