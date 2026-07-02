"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { SignOutButton } from "@/components/ui/SignOutButton";
import { NotificationBell } from "@/components/agent/NotificationBell";

const links = [
  { href: "/agent/dashboard", label: "My Leads" },
  { href: "/agent/training", label: "Training" },
];

export function AgentNav({ agentName }: { agentName: string }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-black">
      {/* Brand row: logo / Agent Accelerator wordmark centered / actions */}
      <div className="mx-auto grid max-w-5xl grid-cols-[1fr_auto_1fr] items-center gap-2 border-b-2 border-copper px-3 py-3 sm:gap-3 sm:px-6">
        <Link href="/agent/dashboard" className="block shrink-0 justify-self-start">
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
        <div className="flex shrink-0 items-center justify-self-end gap-1.5 sm:gap-3">
          <span className="hidden truncate text-sm text-muted md:inline">Hi, {agentName}</span>
          <NotificationBell />
          <SignOutButton />
        </div>
      </div>

      <nav className="mx-auto flex max-w-5xl flex-wrap justify-center gap-2.5 px-6 py-2.5">
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
