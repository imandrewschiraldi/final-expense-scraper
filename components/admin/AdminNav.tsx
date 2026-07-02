"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { SignOutButton } from "@/components/ui/SignOutButton";

const links = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/leads/import", label: "Import Leads" },
  { href: "/admin/leads/assign", label: "Assign Leads" },
  { href: "/admin/agents", label: "Agents" },
  { href: "/admin/training", label: "Training" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-black">
      {/* Brand row: logo + sign out, same layout on mobile and desktop */}
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 border-b-2 border-copper px-4 py-3 sm:px-6">
        <Link href="/admin/dashboard" className="block min-w-0 shrink-0">
          <Image
            src="/agent-accelerator-full-logo.jpg"
            alt="Tier 1 Financial — Agent Accelerator"
            width={1320}
            height={492}
            className="h-12 w-auto sm:h-16"
            priority
          />
        </Link>
        <SignOutButton />
      </div>

      <nav className="mx-auto flex max-w-7xl flex-wrap justify-center gap-2.5 px-6 py-2.5">
        {links.map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "font-condensed rounded-lg border-[1.5px] px-4 py-2 text-[13px] font-bold tracking-[0.05em] uppercase transition-colors",
                active
                  ? "border-copper bg-copper text-black"
                  : "border-copper-dim text-muted hover:border-copper hover:text-foreground",
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
