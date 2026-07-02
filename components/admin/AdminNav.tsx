"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";

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
      <div className="mx-auto grid max-w-7xl grid-cols-[auto_1fr] items-center gap-3 px-6 py-3 sm:grid-cols-[1fr_auto_1fr]">
        <Link href="/admin/dashboard" className="block shrink-0 justify-self-start">
          <Image src="/tier1-logo.jpg" alt="Tier 1 Financial" width={1668} height={593} className="h-10 w-auto shrink-0" priority />
        </Link>
        <Image
          src="/agent-accelerator-wordmark.jpg"
          alt="Agent Accelerator"
          width={841}
          height={95}
          className="hidden h-6 w-auto shrink-0 justify-self-center sm:block"
          priority
        />
        <Button variant="ghost" className="justify-self-end" onClick={() => signOut({ callbackUrl: "/login" })}>
          Sign Out
        </Button>
      </div>
      <nav className="mx-auto flex max-w-7xl flex-wrap justify-center gap-2.5 border-t border-border px-6 py-2.5">
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
