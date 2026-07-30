"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Trophy,
  BookOpen,
  FilePlus2,
  FileBarChart2,
  Network,
  Bell,
  Settings,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { SignOutButton } from "@/components/ui/SignOutButton";
import { NotificationBell } from "@/components/agent/NotificationBell";

type Role = "ADMIN" | "MANAGER" | "AGENT";

const COLLAPSE_STORAGE_KEY = "portal-sidebar-collapsed";

const NAV_ITEMS: { href: string; label: string; icon: typeof LayoutDashboard; roles: Role[] }[] = [
  { href: "/portal/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "MANAGER", "AGENT"] },
  { href: "/portal/organization", label: "Organization Dashboard", icon: Building2, roles: ["ADMIN", "MANAGER", "AGENT"] },
  { href: "/portal/leaderboard", label: "Leaderboard", icon: Trophy, roles: ["ADMIN", "MANAGER", "AGENT"] },
  { href: "/portal/book-of-business", label: "Book of Business", icon: BookOpen, roles: ["ADMIN", "MANAGER", "AGENT"] },
  { href: "/portal/submit-policy", label: "Submit Policy", icon: FilePlus2, roles: ["ADMIN", "MANAGER", "AGENT"] },
  { href: "/portal/reports", label: "Reports", icon: FileBarChart2, roles: ["ADMIN", "MANAGER", "AGENT"] },
  { href: "/portal/hierarchy", label: "Hierarchy", icon: Network, roles: ["ADMIN", "MANAGER"] },
  { href: "/portal/notifications", label: "Notifications", icon: Bell, roles: ["ADMIN", "MANAGER", "AGENT"] },
  { href: "/portal/settings", label: "Settings", icon: Settings, roles: ["ADMIN", "MANAGER", "AGENT"] },
];

type Profile = { name: string; profileImageUrl: string | null; compLevel: string | null };

export function Sidebar({ role, name }: { role: Role; name: string }) {
  const pathname = usePathname();
  // Starts false (matching SSR, which has no access to localStorage) and
  // syncs from persisted state right after mount — an effect+setState is
  // unavoidable here since the real value can only be read client-side.
  const [collapsed, setCollapsed] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  const homeHref = role === "ADMIN" ? "/admin/leads" : "/agent/dashboard";

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (localStorage.getItem(COLLAPSE_STORAGE_KEY) === "true") setCollapsed(true);

    fetch("/api/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data?.profile && setProfile(data.profile));
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_STORAGE_KEY, String(next));
      return next;
    });
  }

  const items = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen shrink-0 flex-col border-r border-white/[0.06] bg-gradient-to-b from-[#0a0a0a] to-black transition-all duration-300 ease-out",
        collapsed ? "w-[68px]" : "w-60",
      )}
    >
      <div className={cn("flex shrink-0 items-center border-b border-border px-3 py-4", collapsed ? "justify-center" : "justify-between")}>
        <Link href={homeHref} className="block shrink-0" title="Back to Agent Accelerator">
          <Image
            src="/tier1-logo.jpg"
            alt="Tier 1 Financial"
            width={1560}
            height={558}
            className={cn("w-auto", collapsed ? "h-8" : "h-10")}
            priority
          />
        </Link>
        {!collapsed && (
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label="Collapse sidebar"
            className="text-muted transition-colors hover:text-foreground"
          >
            <ChevronsLeft className="h-4.5 w-4.5" />
          </button>
        )}
      </div>

      {collapsed && (
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label="Expand sidebar"
          className="flex shrink-0 items-center justify-center border-b border-border py-2 text-muted transition-colors hover:text-foreground"
        >
          <ChevronsRight className="h-4.5 w-4.5" />
        </button>
      )}

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2.5 py-4">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "font-condensed relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-bold tracking-[0.05em] uppercase transition-all duration-150",
                collapsed && "justify-center px-0",
                active
                  ? "bg-copper/[0.12] text-copper shadow-[inset_0_0_0_1px_rgba(200,121,65,0.25)]"
                  : "text-muted hover:bg-white/[0.03] hover:text-foreground",
              )}
            >
              {active && <span className="absolute top-1/2 left-0 h-4 w-[3px] -translate-y-1/2 rounded-r bg-copper" />}
              <Icon className="h-4.5 w-4.5 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-border px-2.5 py-3">
        {!collapsed && (
          <div className="mb-3 flex items-center justify-between">
            <NotificationBell />
            <SignOutButton />
          </div>
        )}

        <Link
          href="/portal/profile"
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-white/[0.04]",
            collapsed && "justify-center px-0",
          )}
        >
          {profile?.profileImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.profileImageUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface2 text-sm font-bold text-muted">
              {(profile?.name ?? name).charAt(0).toUpperCase()}
            </div>
          )}
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{profile?.name ?? name}</p>
              {profile?.compLevel && <p className="truncate text-xs text-muted">{profile.compLevel} Comp</p>}
            </div>
          )}
        </Link>
      </div>
    </aside>
  );
}
