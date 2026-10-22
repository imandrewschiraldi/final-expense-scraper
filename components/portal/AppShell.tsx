"use client";

import { useState } from "react";
import { Sidebar } from "@/components/portal/Sidebar";
import { PageHeader } from "@/components/portal/PageHeader";
import { HeaderDivider } from "@/components/portal/HeaderDivider";
import { TopBarActions } from "@/components/portal/TopBarActions";
import { ContentContainer } from "@/components/portal/ContentContainer";
import { NotificationToaster } from "@/components/portal/NotificationToaster";
import { SoundEffects } from "@/components/portal/SoundEffects";
import { TourProvider } from "@/components/tour/TourProvider";
import { TourOverlay } from "@/components/tour/TourOverlay";

type Role = "ADMIN" | "MANAGER" | "AGENT";

/** Shared shell for every authenticated area (Portal, Agent, Admin) — one
 * copy of the sidebar + main content frame instead of three near-identical
 * layout files, so a shell-level fix (like the header divider below) only
 * needs to happen once. */
export function AppShell({ role, name, children }: { role: Role; name: string; children: React.ReactNode }) {
  // Lives here (not inside Sidebar) because PageHeader's mobile menu button
  // needs to open the same drawer Sidebar renders.
  const [mobileOpen, setMobileOpen] = useState(false);

  // The guided tour is a Manager/Agent onboarding feature — Admin never
  // sees it (no header button, no auto-start, no "Take the Platform Tour"
  // button on their Profile page), not just a filtered-down version of it,
  // so TourProvider/TourOverlay aren't even mounted for that role.
  const showTour = role !== "ADMIN";

  const shell = (
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      <NotificationToaster />
      <SoundEffects />
      <Sidebar role={role} name={name} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <main className="relative min-w-0 flex-1 overflow-y-auto px-4 pt-2 pb-8 sm:px-6 lg:px-10">
        <PageHeader onOpenMenu={() => setMobileOpen(true)} />
        <TopBarActions showTour={showTour} />
        {/* Continues the logo header's bottom edge across the content area
            with a copper accent. Lives inside the scrollable region (not
            viewport-fixed) so it scrolls away with the rest of the page
            instead of staying pinned over content that's scrolled
            underneath it. Omitted on Scripts/Commission Calculator — see
            HeaderDivider. */}
        <HeaderDivider />
        <ContentContainer>{children}</ContentContainer>
      </main>
      {showTour && <TourOverlay role={role} />}
    </div>
  );

  // Wraps the whole shell (not just TourOverlay) so page content — like the
  // "Take the Platform Tour" button on Profile — can also reach useTour().
  return showTour ? <TourProvider role={role}>{shell}</TourProvider> : shell;
}
