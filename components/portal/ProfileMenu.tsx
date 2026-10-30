"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Check, HelpCircle, LogOut, LucideIcon, User, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/cn";
import { useSoundEnabled } from "@/lib/useSoundEnabled";
import { useTour } from "@/components/tour/TourProvider";

type Role = "ADMIN" | "MANAGER" | "AGENT";

type Profile = {
  name: string;
  profileImageUrl: string | null;
};

const ITEM_CLASS =
  "font-condensed flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-bold tracking-[0.03em] text-muted uppercase transition-colors hover:bg-copper-gradient-08 hover:metal-copper-text";

/**
 * The sidebar footer's avatar/name — click opens a menu (My Profile,
 * Interaction Sounds, the platform tour, Log Out) instead of linking
 * straight to the Profile page, so those controls don't need their own
 * separate spots around the shell. Closes on an outside click.
 *
 * `showTour` mirrors AppShell's own role gate (Manager/Agent only) —
 * useTour() throws without a TourProvider ancestor, which only wraps the
 * shell when showTour is true, so the Tour item is skipped for Admin
 * entirely rather than calling the hook and crashing.
 */
export function ProfileMenu({
  profile,
  name,
  role,
  collapsed,
  showTour,
  onNavigate,
  menuAlign = "up",
}: {
  profile: Profile | null;
  name: string;
  role: Role;
  collapsed: boolean;
  showTour: boolean;
  onNavigate?: () => void;
  // "up": sidebar footer usage — opens above the trigger, since it sits at
  // the very bottom of the screen with no room below. "down": header usage
  // (TopBarActions) — opens below the trigger instead, right-aligned so it
  // doesn't run off the viewport's right edge.
  menuAlign?: "up" | "down";
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const displayName = role === "ADMIN" ? "Admin" : (profile?.name ?? name);

  function close() {
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        data-tour="sidebar-profile-link"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-white/[0.04]",
          collapsed && "justify-center px-0",
        )}
      >
        <Avatar profile={profile} displayName={displayName} size={8} />
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{displayName}</p>
          </div>
        )}
      </button>

      {open && (
        <div
          className={cn(
            "absolute z-20 w-64 rounded-[10px] border border-border bg-surface p-2 shadow-lg",
            menuAlign === "up" ? "bottom-full left-0 mb-2" : "top-full right-0 mt-2",
          )}
        >
          <div className="flex items-center gap-2.5 rounded-lg p-2">
            <Avatar profile={profile} displayName={displayName} size={9} />
            <p className="truncate text-sm font-semibold text-white">{displayName}</p>
          </div>
          <div className="my-1 border-t border-border" />
          <MenuLink
            href="/profile"
            icon={User}
            label="Profile"
            onClick={() => {
              close();
              onNavigate?.();
            }}
          />
          <SoundMenuItem />
          {showTour && <TourMenuItem onClose={close} />}
          <div className="my-1 border-t border-border" />
          <button
            type="button"
            onClick={() => {
              close();
              signOut({ callbackUrl: "/login" });
            }}
            className={cn(ITEM_CLASS, "hover:bg-red/10 hover:text-red-light")}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Log Out
          </button>
        </div>
      )}
    </div>
  );
}

function Avatar({ profile, displayName, size }: { profile: Profile | null; displayName: string; size: 8 | 9 }) {
  const dimension = size === 8 ? "h-8 w-8" : "h-9 w-9";
  const pixels = size === 8 ? 32 : 36;
  if (profile?.profileImageUrl) {
    // A raw <img> here would decode the picture at whatever resolution the
    // user uploaded it at — a full-size phone photo can be large enough to
    // crash a memory-constrained mobile WebView (especially the installed
    // iOS Home Screen app) just rendering an avatar this small. next/image
    // routes it through Vercel's optimizer first, so the client only ever
    // fetches/decodes an already-tiny version.
    return (
      <Image
        src={profile.profileImageUrl}
        alt=""
        width={pixels}
        height={pixels}
        className={cn(dimension, "shrink-0 rounded-full object-cover")}
      />
    );
  }
  return (
    <div className={cn(dimension, "flex shrink-0 items-center justify-center rounded-full bg-surface2 text-sm font-bold text-muted")}>
      {displayName.charAt(0).toUpperCase()}
    </div>
  );
}

function MenuLink({ href, icon: Icon, label, onClick }: { href: string; icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <Link href={href} onClick={onClick} className={ITEM_CLASS}>
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );
}

function SoundMenuItem() {
  const [soundEnabled, setSoundEnabled] = useSoundEnabled();
  return (
    <button type="button" onClick={() => setSoundEnabled(!soundEnabled)} className={ITEM_CLASS}>
      {soundEnabled ? <Volume2 className="h-4 w-4 shrink-0" /> : <VolumeX className="h-4 w-4 shrink-0" />}
      <span className="flex-1">Interaction Sounds</span>
      {soundEnabled && <Check className="h-4 w-4 shrink-0 text-[var(--copper-metal)]" />}
    </button>
  );
}

function TourMenuItem({ onClose }: { onClose: () => void }) {
  const { start } = useTour();
  return (
    <button
      type="button"
      onClick={() => {
        onClose();
        start();
      }}
      className={ITEM_CLASS}
    >
      <HelpCircle className="h-4 w-4 shrink-0" />
      Take the Platform Tour
    </button>
  );
}
