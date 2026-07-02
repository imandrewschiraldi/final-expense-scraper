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
    <header className="sticky top-0 z-50 border-b-2 border-copper bg-black">
      {/* Brand row: logo / Agent Accelerator wordmark centered / sign out */}
      <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-3 sm:gap-3 sm:px-6">
        <Link href="/admin/dashboard" className="block shrink-0 justify-self-start">
          <Image src="/tier1-logo.jpg" alt="Tier 1 Financial" width={1668} height={593} className="h-9 w-auto sm:h-14" priority />
        </Link>
        <Image
          src="/agent-accelerator-wordmark.jpg"
          alt="Agent Accelerator"
          width={841}
          height={95}
          className="h-4 w-auto justify-self-center sm:h-9"
          priority
        />
        <div className="justify-self-end">
          <SignOutButton />
        </div>
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
