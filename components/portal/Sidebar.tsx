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
  Settings,
  Users,
  Archive,
  GraduationCap,
  FileText,
  Calculator,
  MessagesSquare,
  UsersRound,
  ChevronsLeft,
  ChevronsRight,
  X,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { SignOutButton } from "@/components/ui/SignOutButton";
import { NotificationBell } from "@/components/agent/NotificationBell";

type Role = "ADMIN" | "MANAGER" | "AGENT";

const COLLAPSE_STORAGE_KEY = "portal-sidebar-collapsed";
// Matches PageHeader's height, so the mobile top bar/drawer line up with the
// desktop sidebar's own logo row at the same height.
export const HEADER_HEIGHT = 74;

type NavItem = { href: string; label: string; icon: LucideIcon; roles: Role[]; requiresVault?: boolean };

// One shared sidebar for the entire platform — Agent Accelerator (leads,
// vault, training) and the Agent Portal (dashboards, book of business, etc.)
// are a single app now, not two navs stitched together.
const NAV_ITEMS: NavItem[] = [
  { href: "/portal/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "MANAGER", "AGENT"] },
  { href: "/portal/agency", label: "Agency Dashboard", icon: Building2, roles: ["ADMIN", "MANAGER", "AGENT"] },
  { href: "/portal/leaderboard", label: "Leaderboard", icon: Trophy, roles: ["ADMIN", "MANAGER", "AGENT"] },
  { href: "/portal/chat", label: "Team Chat", icon: MessagesSquare, roles: ["ADMIN", "MANAGER", "AGENT"] },
  { href: "/portal/book-of-business", label: "Book of Business", icon: BookOpen, roles: ["ADMIN", "MANAGER", "AGENT"] },
  { href: "/portal/submit-policy", label: "Submit Policy", icon: FilePlus2, roles: ["ADMIN", "MANAGER", "AGENT"] },
  { href: "/portal/scripts", label: "Scripts", icon: FileText, roles: ["ADMIN", "MANAGER", "AGENT"] },
  { href: "/portal/commission-calculator", label: "Commission Calculator", icon: Calculator, roles: ["ADMIN", "MANAGER", "AGENT"] },
  { href: "/agent/dashboard", label: "My Leads", icon: Users, roles: ["MANAGER", "AGENT"] },
  { href: "/admin/leads", label: "Leads", icon: Users, roles: ["ADMIN"] },
  { href: "/agent/vault", label: "Vault", icon: Archive, roles: ["MANAGER", "AGENT"], requiresVault: true },
  { href: "/admin/leads/vault", label: "Vault", icon: Archive, roles: ["ADMIN"] },
  { href: "/agent/training", label: "Training", icon: GraduationCap, roles: ["MANAGER", "AGENT"] },
  { href: "/admin/training", label: "Training", icon: GraduationCap, roles: ["ADMIN"] },
  { href: "/portal/reports", label: "Reports", icon: FileBarChart2, roles: ["ADMIN", "MANAGER", "AGENT"] },
  { href: "/portal/hierarchy", label: "Hierarchy", icon: Network, roles: ["ADMIN", "MANAGER"] },
  { href: "/admin/agents", label: "Agents", icon: UsersRound, roles: ["ADMIN"] },
  { href: "/portal/settings", label: "Settings", icon: Settings, roles: ["ADMIN", "MANAGER", "AGENT"] },
];

// "/admin/leads" is a strict prefix of "/admin/leads/vault", so a plain
// startsWith() would light up both nav items whenever Vault is the active
// page. Leads is active for itself and its all/import/assign children, but
// never for /vault.
function isItemActive(pathname: string, href: string) {
  if (href === "/admin/leads") {
    return pathname === href || (pathname.startsWith(`${href}/`) && !pathname.startsWith(`${href}/vault`));
  }
  return pathname.startsWith(href);
}

type Profile = { name: string; profileImageUrl: string | null; compLevel: string | null; hasVaultAccess?: boolean };

function NavLinks({
  items,
  pathname,
  collapsed,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <>
      {items.map((item) => {
        const active = isItemActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            title={collapsed ? item.label : undefined}
            onClick={onNavigate}
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
    </>
  );
}

function SidebarFooter({
  collapsed,
  profile,
  name,
  role,
  onNavigate,
}: {
  collapsed: boolean;
  profile: Profile | null;
  name: string;
  role: Role;
  onNavigate?: () => void;
}) {
  return (
    <div className="shrink-0 border-t border-border px-2.5 py-3">
      {!collapsed && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <NotificationBell />
          <SignOutButton iconOnly />
        </div>
      )}

      <Link
        href="/portal/profile"
        onClick={onNavigate}
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
            <p className="truncate text-sm font-semibold text-white">
              {role === "ADMIN" ? "Admin" : (profile?.name ?? name)}
            </p>
          </div>
        )}
      </Link>
    </div>
  );
}

export function Sidebar({
  role,
  name,
  mobileOpen,
  onCloseMobile,
}: {
  role: Role;
  name: string;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname();
  // Starts false (matching SSR, which has no access to localStorage) and
  // syncs from persisted state right after mount — an effect+setState is
  // unavoidable here since the real value can only be read client-side.
  const [collapsed, setCollapsed] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (localStorage.getItem(COLLAPSE_STORAGE_KEY) === "true") setCollapsed(true);

    fetch("/api/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data?.profile && setProfile(data.profile));
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_STORAGE_KEY, String(next));
      return next;
    });
  }

  const items = NAV_ITEMS.filter((item) => item.roles.includes(role) && (!item.requiresVault || profile?.hasVaultAccess));

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer — an overlay, not a layout column, so it never
          competes with page content for width. No logo in the drawer
          itself; it lives in PageHeader's mobile-only top bar instead. */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[80vw] flex-col bg-gradient-to-b from-[#0a0a0a] to-black transition-transform duration-300 ease-out lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex shrink-0 items-center justify-end px-3" style={{ height: HEADER_HEIGHT }}>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close menu"
            className="text-muted transition-colors hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2.5 py-4">
          <NavLinks items={items} pathname={pathname} collapsed={false} onNavigate={onCloseMobile} />
        </nav>
        <SidebarFooter collapsed={false} profile={profile} name={name} role={role} onNavigate={onCloseMobile} />
      </aside>

      {/* Desktop sidebar — a real layout column, collapsible via the chevron. */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-white/[0.06] bg-gradient-to-b from-[#0a0a0a] to-black transition-all duration-300 ease-out lg:flex",
          collapsed ? "w-[68px]" : "w-60",
        )}
      >
        <div
          className={cn("flex shrink-0 items-center px-3", collapsed ? "justify-center" : "justify-between")}
          style={{ height: HEADER_HEIGHT }}
        >
          <Link href="/portal/dashboard" className="block shrink-0">
            {collapsed ? (
              <Image
                src="/tier1-mark-collapsed.png"
                alt="Tier 1 Financial"
                width={950}
                height={1112}
                className="h-auto w-8"
                priority
              />
            ) : (
              <Image src="/tier1-logo.jpg" alt="Tier 1 Financial" width={1560} height={558} className="h-10 w-auto" priority />
            )}
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
          <NavLinks items={items} pathname={pathname} collapsed={collapsed} />
        </nav>

        <SidebarFooter collapsed={collapsed} profile={profile} name={name} role={role} />
      </aside>
    </>
  );
}
