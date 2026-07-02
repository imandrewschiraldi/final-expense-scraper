"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { NotificationBell } from "@/components/agent/NotificationBell";

const links = [
  { href: "/agent/dashboard", label: "My Leads" },
  { href: "/agent/training", label: "Training" },
];

export function AgentNav({ agentName }: { agentName: string }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b-2 border-copper bg-black">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-3.5">
        <div className="flex items-center gap-3">
          <Link href="/agent/dashboard" className="block">
            <Image src="/tier1-logo.jpg" alt="Tier 1 Financial" width={1668} height={593} className="h-[46px] w-auto" priority />
          </Link>
          <span className="text-sm text-muted">Hi, {agentName}</span>
        </div>
        <nav className="flex flex-wrap gap-2.5">
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
        <div className="flex items-center gap-3">
          <NotificationBell />
          <Button variant="ghost" onClick={() => signOut({ callbackUrl: "/login" })}>
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  );
}
