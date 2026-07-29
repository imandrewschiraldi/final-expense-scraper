"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { SignOutButton } from "@/components/ui/SignOutButton";
import { NotificationBell } from "@/components/agent/NotificationBell";

const tabs = [
  { href: "/portal/dashboard", label: "Dashboard" },
  { href: "/portal/leaderboard", label: "Leaderboard" },
  { href: "/portal/book-of-business", label: "Book of Business" },
  { href: "/portal/leads", label: "Leads" },
  { href: "/portal/resources", label: "Resources" },
];

export function PortalNav({ role, name }: { role: "ADMIN" | "AGENT"; name: string }) {
  const pathname = usePathname();
  const homeHref = role === "ADMIN" ? "/admin/dashboard" : "/agent/dashboard";

  return (
    <header className="sticky top-0 z-50 bg-black">
      <div className="border-b-2 border-copper">
        <div className="lg:hidden">
          <div className="flex items-center justify-between gap-2 px-1.5 pt-2.5">
            <Link href={homeHref} className="block shrink-0">
              <Image src="/tier1-logo.jpg" alt="Tier 1 Financial" width={1560} height={558} className="h-9 w-auto sm:h-11" priority />
            </Link>
            <div className="flex shrink-0 items-center gap-1.5">
              {role === "AGENT" && <NotificationBell />}
              <SignOutButton />
            </div>
          </div>
          <Image
            src="/agent-accelerator-wordmark.jpg"
            alt="Agent Accelerator"
            width={841}
            height={95}
            className="mx-auto mt-1 mb-2.5 block h-7 w-auto sm:h-9"
            priority
          />
        </div>

        <div className="mx-auto hidden max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-2.5 py-3.5 lg:grid">
          <Link href={homeHref} className="block shrink-0 justify-self-start">
            <Image src="/tier1-logo.jpg" alt="Tier 1 Financial" width={1560} height={558} className="h-[46px] w-auto" priority />
          </Link>
          <Image
            src="/agent-accelerator-wordmark.jpg"
            alt="Agent Accelerator"
            width={841}
            height={95}
            className="h-11 w-auto justify-self-center"
            priority
          />
          <div className="flex shrink-0 items-center justify-self-end gap-3">
            <span className="hidden truncate text-sm text-muted xl:inline">Hi, {name}</span>
            {role === "AGENT" && <NotificationBell />}
            <SignOutButton />
          </div>
        </div>
      </div>

      <nav className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-2.5 px-6 py-2.5">
        <Link
          href={homeHref}
          className="font-condensed rounded-lg border-[1.5px] border-border px-4 py-2 text-[13px] font-bold tracking-[0.05em] text-muted uppercase transition-colors hover:border-copper hover:text-foreground"
        >
          ← Back
        </Link>
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "font-condensed rounded-lg border-[1.5px] px-4 py-2 text-[13px] font-bold tracking-[0.05em] uppercase transition-colors",
                active
                  ? "border-copper bg-copper text-black"
                  : "border-copper-dim text-muted hover:border-copper hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
