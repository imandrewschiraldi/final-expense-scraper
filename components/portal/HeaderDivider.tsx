"use client";

import { usePathname } from "next/navigation";
import { HEADER_HEIGHT } from "@/components/portal/Sidebar";

// Scripts and Commission Calculator render their own copper line inside
// the embedded tool's header now (so it can scroll away with that iframe's
// own content — something this outer line fundamentally can't do, since
// the iframe is cross-origin and its internal scroll isn't observable from
// here). Showing both would double up the line on those two pages.
const NO_OUTER_LINE_PREFIXES = ["/portal/scripts", "/portal/commission-calculator"];

export function HeaderDivider() {
  const pathname = usePathname();
  if (NO_OUTER_LINE_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-10 -mx-4 h-0.5 bg-copper sm:-mx-6 lg:-mx-10"
      style={{ top: HEADER_HEIGHT }}
    />
  );
}
