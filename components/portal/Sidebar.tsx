"use client";

import { useEffect, useRef, useState } from "react";
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
  Users,
  Archive,
  GraduationCap,
  FileText,
  Calculator,
  Quote,
  MessagesSquare,
  UsersRound,
  Percent,
  Landmark,
  Bot,
  Radar,
  Stethoscope,
  ShoppingCart,
  ChevronsLeft,
  ChevronsRight,
  Maximize2,
  Minimize2,
  Search,
  X,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useWideLayout } from "@/lib/useWideLayout";
import { ProfileMenu } from "@/components/portal/ProfileMenu";

type Role = "ADMIN" | "MANAGER" | "AGENT";

const COLLAPSE_STORAGE_KEY = "portal-sidebar-collapsed";
// Matches PageHeader's height, so the mobile top bar/drawer line up with the
// desktop sidebar's own logo row at the same height.
export const HEADER_HEIGHT = 74;

type NavSection = "overview" | "team" | "leads" | "sell" | "ops" | "admin";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
  section: NavSection;
  requiresVault?: boolean;
  requiresAgencyDashboard?: boolean;
  requiresRecruitingRadar?: boolean;
};

// One shared sidebar for the entire platform — Agent Accelerator (leads,
// vault, training) and the Agent Portal (dashboards, book of business, etc.)
// are a single app now, not two navs stitched together.
//
// Grouped into sections (a thin divider renders between each, see NavLinks)
// instead of one flat list — Team Chat and Training sit right after
// Overview rather than buried near the bottom, so a new agent lands on
// training/communication tools immediately below their dashboard.
const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "MANAGER", "AGENT"], section: "overview" },
  { href: "/agency", label: "Agency Dashboard", icon: Building2, roles: ["ADMIN", "MANAGER", "AGENT"], requiresAgencyDashboard: true, section: "overview" },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy, roles: ["ADMIN", "MANAGER", "AGENT"], section: "overview" },

  { href: "/chat", label: "Team Chat", icon: MessagesSquare, roles: ["ADMIN", "MANAGER", "AGENT"], section: "team" },
  { href: "/agent/training", label: "Training", icon: GraduationCap, roles: ["MANAGER", "AGENT"], section: "team" },
  { href: "/admin/training", label: "Training", icon: GraduationCap, roles: ["ADMIN"], section: "team" },

  { href: "/agent/dashboard", label: "My Leads", icon: Users, roles: ["MANAGER", "AGENT"], section: "leads" },
  { href: "/agent/vault", label: "Vault", icon: Archive, roles: ["MANAGER", "AGENT"], requiresVault: true, section: "leads" },
  { href: "/agent/buy-leads", label: "Buy Leads", icon: ShoppingCart, roles: ["MANAGER", "AGENT"], section: "leads" },
  { href: "/book-of-business", label: "Book of Business", icon: BookOpen, roles: ["MANAGER", "AGENT"], section: "leads" },
  { href: "/admin/leads", label: "Leads", icon: Users, roles: ["ADMIN"], section: "leads" },
  { href: "/admin/leads/vault", label: "Vault", icon: Archive, roles: ["ADMIN"], section: "leads" },

  { href: "/submit-policy", label: "Submit Policy", icon: FilePlus2, roles: ["MANAGER", "AGENT"], section: "sell" },
  { href: "/scripts", label: "Scripts", icon: FileText, roles: ["MANAGER", "AGENT"], section: "sell" },
  { href: "/quoter", label: "Quote Tool", icon: Quote, roles: ["MANAGER", "AGENT"], section: "sell" },
  { href: "/underwriting-genie", label: "Underwriting Genie", icon: Stethoscope, roles: ["ADMIN", "MANAGER", "AGENT"], section: "sell" },
  { href: "/commission-calculator", label: "Commission Calculator", icon: Calculator, roles: ["MANAGER", "AGENT"], section: "sell" },
  { href: "/ask-integrity", label: "Ask Integrity", icon: Bot, roles: ["ADMIN", "MANAGER", "AGENT"], section: "sell" },
  { href: "/carrier-resources", label: "Carrier Resources", icon: Landmark, roles: ["MANAGER", "AGENT"], section: "sell" },
  { href: "/admin/carrier-resources", label: "Carrier Resources", icon: Landmark, roles: ["ADMIN"], section: "sell" },

  {
    href: "/admin/recruiting-radar",
    label: "Recruiting Radar",
    icon: Radar,
    roles: ["ADMIN", "MANAGER", "AGENT"],
    requiresRecruitingRadar: true,
    section: "ops",
  },
  { href: "/reports", label: "Reports", icon: FileBarChart2, roles: ["ADMIN", "MANAGER", "AGENT"], section: "ops" },

  { href: "/hierarchy", label: "Hierarchy", icon: Network, roles: ["ADMIN", "MANAGER"], section: "admin" },
  { href: "/admin/agents", label: "Agents", icon: UsersRound, roles: ["ADMIN"], section: "admin" },
  { href: "/admin/carriers", label: "Carrier Rates", icon: Percent, roles: ["ADMIN"], section: "admin" },
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

type Profile = {
  name: string;
  profileImageUrl: string | null;
  compLevel: string | null;
  hasVaultAccess?: boolean;
  agencyDashboardEnabled?: boolean;
  recruitingRadarEnabled?: boolean;
};

function NavLeaf({
  href,
  label,
  icon: Icon,
  collapsed,
  active,
  showDot,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  collapsed: boolean;
  active: boolean;
  showDot: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      onClick={onNavigate}
      className={cn(
        "font-condensed relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-bold tracking-[0.05em] uppercase transition-all duration-200",
        collapsed && "justify-center px-0",
        active
          ? "bg-copper-gradient-12 text-[var(--copper-metal)] shadow-[inset_0_0_0_1px_rgba(172,90,42,0.25)]"
          : "text-muted hover:bg-copper-gradient-08 hover:text-[var(--copper-metal)] hover:glow-copper-gradient",
      )}
    >
      {active && <span className="metal-copper-line absolute top-1/2 left-0 h-4 w-[3px] -translate-y-1/2 rounded-r" />}
      <span className="relative shrink-0">
        <Icon className="h-4.5 w-4.5" />
        {showDot && collapsed && (
          <span className="metal-copper-surface absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-surface" />
        )}
      </span>
      {!collapsed && <span className={cn("truncate", active && "metal-copper-text")}>{label}</span>}
      {showDot && !collapsed && <span className="metal-copper-surface ml-auto h-2 w-2 shrink-0 rounded-full" />}
    </Link>
  );
}

function SidebarSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  // ⌘K/Ctrl+K jumps to whichever copy of this is actually visible — mobile
  // drawer and desktop sidebar both render one, but only one is ever
  // on-screen at a time (the other's display:none, so .focus() on it is a
  // no-op), so both listeners existing at once is harmless.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="relative mb-3 px-0.5">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search everything..."
        className="w-full rounded-lg border border-border bg-surface2 py-1.5 pr-9 pl-8 text-[13px] text-foreground placeholder:text-muted focus:border-copper-dim-gradient focus:outline-none"
      />
      <kbd className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 rounded border border-border px-1 py-0.5 text-[10px] text-muted">
        ⌘K
      </kbd>
    </div>
  );
}

function NavLinks({
  items,
  pathname,
  collapsed,
  onNavigate,
  chatUnread,
}: {
  items: NavItem[];
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
  chatUnread?: boolean;
}) {
  return (
    <>
      {items.map((item, index) => {
        const active = isItemActive(pathname, item.href);
        const showDot = Boolean(item.href === "/chat" && chatUnread && !active);
        // A thin divider between sections instead of a text label — only
        // between two items whose section actually differs, so a search
        // filter (or a role hiding a whole section) never leaves a stray
        // line at the top of the list.
        const showDivider = index > 0 && item.section !== items[index - 1].section;
        return (
          <div key={item.href}>
            {showDivider && <div className="mx-1 my-1.5 border-t border-border" />}
            <NavLeaf
              href={item.href}
              label={item.label}
              icon={item.icon}
              collapsed={collapsed}
              active={active}
              showDot={showDot}
              onNavigate={onNavigate}
            />
          </div>
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
      <ProfileMenu
        profile={profile}
        name={name}
        role={role}
        collapsed={collapsed}
        showTour={role !== "ADMIN"}
        onNavigate={onNavigate}
      />
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
  const [chatUnread, setChatUnread] = useState(false);
  const [wide, setWide] = useWideLayout();
  const [search, setSearch] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (localStorage.getItem(COLLAPSE_STORAGE_KEY) === "true") setCollapsed(true);

    fetch("/api/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data?.profile && setProfile(data.profile));
  }, []);

  useEffect(() => {
    function load() {
      fetch("/api/portal/chat/channels")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.channels) setChatUnread(data.channels.some((c: { unread: boolean }) => c.unread));
        })
        .catch(() => {});
    }
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
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

  const items = NAV_ITEMS.filter(
    (item) =>
      item.roles.includes(role) &&
      (!item.requiresVault || profile?.hasVaultAccess) &&
      (!item.requiresAgencyDashboard || profile?.agencyDashboardEnabled) &&
      // Unlike requiresAgencyDashboard (default-on, admin can withdraw it),
      // Recruiting Radar is an admin tool by default — ADMIN always sees it
      // regardless of this flag; it only gates AGENT/MANAGER.
      (!item.requiresRecruitingRadar || role === "ADMIN" || profile?.recruitingRadarEnabled),
  );

  const query = search.trim().toLowerCase();
  const visibleItems = query ? items.filter((item) => item.label.toLowerCase().includes(query)) : items;

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
          competes with page content for width. It sits above PageHeader's
          mobile-only top bar (higher z-index), fully covering it while
          open, so the drawer carries its own logo rather than relying on
          the (now-hidden) top bar's. */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[80vw] flex-col bg-gradient-to-b from-surface to-background transition-transform duration-300 ease-out lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex shrink-0 items-center justify-between px-3" style={{ height: HEADER_HEIGHT }}>
          <Link href="/dashboard" className="block shrink-0" onClick={onCloseMobile}>
            <Image src="/tier1-logo-transparent.png" alt="Tier 1 Financial" width={1560} height={558} className="h-9 w-auto" priority />
          </Link>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close menu"
            className="text-muted transition-colors hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex flex-1 flex-col overflow-y-auto px-2.5 py-4">
          <SidebarSearch value={search} onChange={setSearch} />
          <div className="flex flex-col gap-1">
            <NavLinks items={visibleItems} pathname={pathname} collapsed={false} onNavigate={onCloseMobile} chatUnread={chatUnread} />
          </div>
        </nav>
        <SidebarFooter collapsed={false} profile={profile} name={name} role={role} onNavigate={onCloseMobile} />
      </aside>

      {/* Desktop sidebar — a real layout column, collapsible via the chevron. */}
      <aside
        data-tour-ui="sidebar"
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-white/[0.06] bg-gradient-to-b from-surface to-background transition-all duration-300 ease-out lg:flex",
          collapsed ? "w-[68px]" : "w-60",
        )}
      >
        <div
          className={cn("flex shrink-0 items-center px-3", collapsed ? "justify-center" : "justify-between")}
          style={{ height: HEADER_HEIGHT }}
        >
          <Link href="/dashboard" className="block shrink-0">
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
              <Image src="/tier1-logo-transparent.png" alt="Tier 1 Financial" width={1560} height={558} className="h-10 w-auto" priority />
            )}
          </Link>
          {!collapsed && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setWide(!wide)}
                aria-label={wide ? "Use standard width" : "Use wide layout for large monitors"}
                title={wide ? "Use standard width" : "Use wide layout for large monitors"}
                className={cn(
                  "transition-colors hover:text-foreground",
                  wide ? "text-[var(--copper-metal)]" : "text-muted",
                )}
              >
                {wide ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={toggleCollapsed}
                aria-label="Collapse sidebar"
                className="text-muted transition-colors hover:text-foreground"
              >
                <ChevronsLeft className="h-4.5 w-4.5" />
              </button>
            </div>
          )}
        </div>
        {/* A separate bar right after the fixed-height header row, not a
            border on it — matches HeaderDivider's own placement exactly
            (a 2px bar starting at top: HEADER_HEIGHT), so the two lines
            land pixel-aligned instead of a border-box border sitting 2px
            higher, inside the row itself. */}
        <div className="metal-copper-line h-0.5 shrink-0" />

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

        <nav className="flex flex-1 flex-col overflow-y-auto px-2.5 py-4">
          {!collapsed && <SidebarSearch value={search} onChange={setSearch} />}
          <div className="flex flex-col gap-1">
            <NavLinks items={collapsed ? items : visibleItems} pathname={pathname} collapsed={collapsed} chatUnread={chatUnread} />
          </div>
        </nav>

        <SidebarFooter collapsed={collapsed} profile={profile} name={name} role={role} />
      </aside>
    </>
  );
}
