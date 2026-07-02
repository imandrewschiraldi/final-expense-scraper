"use client";

import Link from "next/link";
import Image from "next/image";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { NotificationBell } from "@/components/agent/NotificationBell";

export function AgentNav({ agentName }: { agentName: string }) {
  return (
    <header className="sticky top-0 z-50 border-b-2 border-copper bg-black">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
        <div className="flex items-center gap-3">
          <Link href="/agent/dashboard" className="block">
            <Image src="/tier1-logo.jpg" alt="Tier 1 Financial" width={1668} height={593} className="h-[46px] w-auto" priority />
          </Link>
          <span className="text-sm text-muted">Hi, {agentName}</span>
        </div>
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
