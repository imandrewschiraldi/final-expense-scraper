"use client";

import { usePathname } from "next/navigation";

// Scripts and Commission Calculator render a full-bleed iframe that's meant
// to reach the actual edges of the browser window (so the embedded tool's
// own header/line span edge to edge on wide monitors) — the shared
// max-w-6xl reading-width wrapper every other page uses would otherwise cap
// the iframe at 1152px, centered, no matter how wide the screen is. Quoter
// gave this up once it got its own graphic PageHeading (see quoter/page.tsx)
// — that heading has to sit in the same centered column every other page's
// heading does, so the embed below it stays in that column too rather than
// suddenly bleeding to the viewport edges right under a centered title.
// Carrier Resources also opts in — its title/description banner is meant
// to be a full-width band directly under the header's copper line, edge to
// edge, with the carrier grid below it re-centered back into its own
// max-w-6xl wrapper (see carrier-resources/page.tsx).
const FULL_BLEED_PREFIXES = ["/portal/scripts", "/portal/commission-calculator", "/portal/carrier-resources"];

export function ContentContainer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (FULL_BLEED_PREFIXES.some((p) => pathname.startsWith(p))) {
    return <div className="h-full w-full">{children}</div>;
  }

  return <div className="mx-auto w-full max-w-6xl">{children}</div>;
}
