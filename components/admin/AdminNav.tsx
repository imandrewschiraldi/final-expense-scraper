"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";

const links = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/leads/import", label: "Import Leads" },
  { href: "/admin/leads/assign", label: "Assign Leads" },
  { href: "/admin/agents", label: "Agents" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-8">
          <span className="text-xl font-semibold uppercase tracking-wide text-copper-light">
            Tier 1 <span className="text-gold">Admin</span>
          </span>
          <nav className="flex gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm uppercase tracking-wide transition-colors",
                  pathname.startsWith(link.href)
                    ? "bg-copper/10 text-copper-light"
                    : "text-muted hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <Button variant="ghost" onClick={() => signOut({ callbackUrl: "/login" })}>
          Sign Out
        </Button>
      </div>
    </header>
  );
}
