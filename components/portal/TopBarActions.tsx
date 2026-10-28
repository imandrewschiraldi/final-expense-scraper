"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon, Search, Settings, Sun } from "lucide-react";
import { NotificationBell } from "@/components/agent/NotificationBell";
import { HEADER_HEIGHT } from "@/components/portal/Sidebar";
import { NO_OUTER_LINE_PREFIXES } from "@/components/portal/HeaderDivider";
import { useTheme } from "@/lib/useTheme";

type Profile = { name: string; profileImageUrl: string | null };

/**
 * Notifications — pulled out of the sidebar footer and into the top-right
 * corner of every page instead, above the copper accent line (HeaderDivider
 * sits at HEADER_HEIGHT). Sound, Tour, and Sign Out still live in the
 * sidebar's own profile menu (see ProfileMenu) — the avatar button here is
 * a shortcut to /profile, not a second copy of that dropdown.
 *
 * The search box + Settings/avatar shortcuts are lg+ only: below that,
 * PageHeader already fills this same row with the mobile hamburger + logo,
 * so only the bell (the original, unchanged mobile behavior) renders there.
 *
 * `left-4/right-4 sm:left-6/right-6 lg:left-10/right-10` deliberately
 * mirrors main's own padding — an absolutely positioned child's inset is
 * relative to main's padding-box edge, which ignores that padding entirely
 * (see HeaderDivider's own note on this), so it has to be replicated here to
 * land in the same place normal content's edges do.
 *
 * Omitted on Scripts/Commission Calculator — same reasoning as
 * HeaderDivider's own copper line there: the embedded tool on those pages
 * draws its own Notifications-equivalent control in its own header, and our
 * outer copy would render right on top of it.
 */
export function TopBarActions() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [theme, setTheme] = useTheme();

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data?.profile && setProfile(data.profile));
  }, []);

  if (NO_OUTER_LINE_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  return (
    <>
      {/* Desktop: search (left) + utility icons (right), same row the
          copper accent line sits just below. */}
      <div
        className="absolute top-0 left-4 right-4 z-40 hidden items-center justify-between gap-3 sm:left-6 sm:right-6 lg:left-10 lg:right-10 lg:flex"
        style={{ height: HEADER_HEIGHT }}
      >
        <div className="relative w-full max-w-[240px]">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search everything..."
            className="w-full rounded-lg border border-border bg-surface py-2 pr-3 pl-9 text-sm text-foreground placeholder:text-muted focus:border-copper-dim-gradient focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            className="text-muted transition-colors hover:text-foreground"
          >
            {theme === "light" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <NotificationBell />
          <Link
            href="/profile"
            aria-label="Settings"
            title="Settings"
            className="text-muted transition-colors hover:text-foreground"
          >
            <Settings className="h-5 w-5" />
          </Link>
          <Link href="/profile" aria-label="My Profile" title={profile?.name ?? "My Profile"}>
            {profile?.profileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.profileImageUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface2 text-sm font-bold text-muted">
                {(profile?.name ?? "?").charAt(0).toUpperCase()}
              </div>
            )}
          </Link>
        </div>
      </div>

      {/* Mobile/tablet: unchanged from before — just the bell, same spot. */}
      <div
        className="absolute top-0 right-4 z-40 flex items-center gap-2 sm:right-6 lg:hidden"
        style={{ height: HEADER_HEIGHT }}
      >
        <NotificationBell />
      </div>
    </>
  );
}
