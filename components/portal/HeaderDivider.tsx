"use client";

import { usePathname } from "next/navigation";
import { HEADER_HEIGHT } from "@/components/portal/Sidebar";

// Scripts and Commission Calculator render their own copper line inside
// the embedded tool's header now (so it can scroll away with that iframe's
// own content — something this outer line fundamentally can't do, since
// the iframe is cross-origin and its internal scroll isn't observable from
// here). Showing both would double up the line on those two pages. Quoter
// doesn't have that — its embedded tools are third-party, not Tier 1's own
// — so it keeps this outer line and starts its own content below it.
const NO_OUTER_LINE_PREFIXES = ["/portal/scripts", "/portal/commission-calculator"];

// main's own `pt-2` (8px). PageHeader (the mobile top bar) is meant to
// cancel this out with a matching `-mt-2` so it sits flush at the true
// top — but combined with `position: sticky`, that negative margin
// doesn't take effect the way it would on a normal flow element, so
// PageHeader actually renders 8px lower than intended. Below lg (where
// PageHeader exists), this line has to sit 8px lower too, to stay below
// PageHeader's real bottom edge instead of hidden underneath it.
const MAIN_PADDING_TOP = 8;

// `inset-x-0` alone already reaches main's true left/right edges — an
// absolutely positioned element's inset is relative to its containing
// block's padding edge, which ignores main's own px-4/sm:px-6/lg:px-10
// padding. A `-mx-*` on top of that doesn't "cancel padding" the way it
// does on a normal flow element; it just pushes the line past the
// viewport edge entirely, which was causing it to scroll a sliver into
// view on mobile instead of sitting flush — so it's intentionally
// omitted (kept off both copies below).
const LINE_CLASS = "metal-copper-line pointer-events-none absolute inset-x-0 z-10 h-0.5";

export function HeaderDivider() {
  const pathname = usePathname();
  if (NO_OUTER_LINE_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  return (
    <>
      <div className={`${LINE_CLASS} lg:hidden`} style={{ top: HEADER_HEIGHT + MAIN_PADDING_TOP }} />
      <div className={`${LINE_CLASS} hidden lg:block`} style={{ top: HEADER_HEIGHT }} />
    </>
  );
}
