"use client";

import { usePathname } from "next/navigation";
import { NotificationBell } from "@/components/agent/NotificationBell";
import { HEADER_HEIGHT } from "@/components/portal/Sidebar";
import { NO_OUTER_LINE_PREFIXES } from "@/components/portal/HeaderDivider";

/**
 * Notifications — pulled out of the sidebar footer and into the top-right
 * corner of every page instead, above the copper accent line (HeaderDivider
 * sits at HEADER_HEIGHT). Sound, Tour, and Sign Out live in the sidebar's
 * profile menu instead (see ProfileMenu) rather than as separate controls
 * here.
 *
 * `right-4 sm:right-6 lg:right-10` deliberately mirrors main's own padding
 * — an absolutely positioned child's `right` offset is relative to main's
 * padding-box edge, which ignores that padding entirely (see
 * HeaderDivider's own note on this), so it has to be replicated here to
 * land in the same place normal content's right edge does.
 *
 * Omitted on Scripts/Commission Calculator — same reasoning as
 * HeaderDivider's own copper line there: the embedded tool on those pages
 * draws its own Notifications-equivalent control in its own header, and our
 * outer copy would render right on top of it.
 */
export function TopBarActions() {
  const pathname = usePathname();
  if (NO_OUTER_LINE_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  return (
    <div
      className="absolute top-0 right-4 z-40 flex items-center gap-2 sm:right-6 lg:right-10"
      style={{ height: HEADER_HEIGHT }}
    >
      <NotificationBell />
    </div>
  );
}
