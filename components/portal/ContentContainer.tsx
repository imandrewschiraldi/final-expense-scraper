"use client";

import { usePathname } from "next/navigation";

// Scripts and Commission Calculator render a full-bleed iframe that's meant
// to reach the actual edges of the browser window (so the embedded tool's
// own header/line span edge to edge) — EmbeddedTool cancels out main's own
// px-4/sm:px-6/lg:px-10 gutter (see AppShell) with matching negative
// margins, which only works if this wrapper itself adds no padding of its
// own on top of that.
const FULL_BLEED_PREFIXES = ["/scripts", "/commission-calculator"];

// Every other page fills whatever width the browser window actually is — a
// 34" monitor gets a 34" page, same as any other dashboard-style app — with
// just main's own small fixed gutter on each side. This replaced an opt-in
// "wide mode" that capped out at 1800px even turned on, and defaulted to a
// 1152px centered column otherwise: both left large stretches of a wide
// monitor empty no matter what. No padding here — main already provides it.
export function ContentContainer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (FULL_BLEED_PREFIXES.some((p) => pathname.startsWith(p))) {
    return <div className="h-full w-full">{children}</div>;
  }

  return <div className="w-full">{children}</div>;
}
