"use client";

import { useState } from "react";
import { Sidebar } from "@/components/portal/Sidebar";
import { PageHeader } from "@/components/portal/PageHeader";
import { HeaderDivider } from "@/components/portal/HeaderDivider";
import { ContentContainer } from "@/components/portal/ContentContainer";

type Role = "ADMIN" | "MANAGER" | "AGENT";

/** Shared shell for every authenticated area (Portal, Agent, Admin) — one
 * copy of the sidebar + main content frame instead of three near-identical
 * layout files, so a shell-level fix (like the header divider below) only
 * needs to happen once. */
export function AppShell({ role, name, children }: { role: Role; name: string; children: React.ReactNode }) {
  // Lives here (not inside Sidebar) because PageHeader's mobile menu button
  // needs to open the same drawer Sidebar renders.
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      <Sidebar role={role} name={name} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <main className="relative min-w-0 flex-1 overflow-y-auto px-4 pt-2 pb-8 sm:px-6 lg:px-10">
        <PageHeader onOpenMenu={() => setMobileOpen(true)} />
        {/* Continues the logo header's bottom edge across the content area
            with a copper accent. Lives inside the scrollable region (not
            viewport-fixed) so it scrolls away with the rest of the page
            instead of staying pinned over content that's scrolled
            underneath it. Omitted on Scripts/Commission Calculator — see
            HeaderDivider. */}
        <HeaderDivider />
        <ContentContainer>{children}</ContentContainer>
      </main>
    </div>
  );
}
