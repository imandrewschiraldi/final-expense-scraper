"use client";

import { Info } from "lucide-react";

/** Label row shared by every Overview widget that has something worth
 *  explaining — an Info icon paired with a native `title` tooltip, same
 *  convention the Agency Dashboard's KPI tiles already use
 *  (title={meta.explain}), rather than a new tooltip component. */
export function SectionLabel({ children, explain }: { children: React.ReactNode; explain: string }) {
  return (
    <span className="flex items-center gap-1 text-sm font-semibold text-white" title={explain}>
      {children}
      <Info className="h-3.5 w-3.5 text-muted" />
    </span>
  );
}
