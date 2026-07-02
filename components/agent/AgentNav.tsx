"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { NotificationBell } from "@/components/agent/NotificationBell";

export function AgentNav({ agentName }: { agentName: string }) {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <div>
          <span className="text-xl font-semibold uppercase tracking-wide text-copper-light">Tier 1</span>
          <span className="ml-2 text-sm text-muted">Hi, {agentName}</span>
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
