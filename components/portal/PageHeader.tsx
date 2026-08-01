"use client";

import Link from "next/link";
import Image from "next/image";
import { Menu } from "lucide-react";
import { HEADER_HEIGHT } from "@/components/portal/Sidebar";

/** Mobile-only top bar (hamburger + logo) shown in place of the desktop
 * sidebar's own logo, which the mobile drawer doesn't have room for. Desktop
 * is untouched — the sidebar keeps its logo exactly as before, and this
 * renders nothing at the lg breakpoint and up. */
export function PageHeader({ onOpenMenu }: { onOpenMenu: () => void }) {
  return (
    <div
      className="sticky top-0 z-30 -mx-4 -mt-2 flex shrink-0 items-center gap-3 border-b border-white/[0.06] bg-black px-4 sm:-mx-6 sm:px-6 lg:hidden"
      style={{ height: HEADER_HEIGHT }}
    >
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open menu"
        className="text-muted transition-colors hover:text-foreground"
      >
        <Menu className="h-6 w-6" />
      </button>
      <Link href="/portal/dashboard" className="block shrink-0">
        <Image src="/tier1-logo.jpg" alt="Tier 1 Financial" width={1560} height={558} className="h-9 w-auto" priority />
      </Link>
    </div>
  );
}
