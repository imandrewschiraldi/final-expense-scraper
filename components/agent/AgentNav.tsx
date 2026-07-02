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
    <header className="sticky top-0 z-50 border-b-2 border-copper bg-black">
      {/* Mobile brand row: logo + action icons, wordmark on its own row below */}
      <div className="flex items-center justify-between gap-2 px-4 pt-3 sm:hidden">
        <Link href="/agent/dashboard" className="block shrink-0">
          <Image src="/tier1-logo.jpg" alt="Tier 1 Financial" width={1668} height={593} className="h-9 w-auto" priority />
        </Link>
        <div className="flex shrink-0 items-center gap-1.5">
          <NotificationBell />
          <SignOutButton />
        </div>
      </div>
      <Image
        src="/agent-accelerator-wordmark.jpg"
        alt="Agent Accelerator"
        width={841}
        height={95}
        className="mx-auto mt-1.5 block h-5 w-auto sm:hidden"
        priority
      />

      {/* Desktop brand row: logo / wordmark / actions in one line */}
      <div className="mx-auto hidden max-w-5xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-6 py-3 sm:grid">
        <div className="flex min-w-0 items-center gap-3 justify-self-start">
          <Link href="/agent/dashboard" className="block shrink-0">
            <Image src="/tier1-logo.jpg" alt="Tier 1 Financial" width={1668} height={593} className="h-10 w-auto" priority />
          </Link>
          <span className="truncate text-sm text-muted">Hi, {agentName}</span>
        </div>
        <Image
          src="/agent-accelerator-wordmark.jpg"
          alt="Agent Accelerator"
          width={841}
          height={95}
          className="h-6 w-auto justify-self-center"
          priority
        />
        <div className="flex items-center justify-end gap-3 justify-self-end">
          <NotificationBell />
          <SignOutButton />
        </div>
      </div>

      <nav className="mx-auto flex max-w-5xl flex-wrap justify-center gap-2.5 border-t border-border px-6 py-2.5">
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
