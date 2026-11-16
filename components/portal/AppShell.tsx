"use client";

import { useEffect, useState } from "react";
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
export function AppShell({
  role,
  name,
  children,
}: {
  role: Role;
  name: string;
  children: React.ReactNode;
}) {
  // Lives here (not inside Sidebar) because PageHeader's mobile menu button
  // needs to open the same drawer Sidebar renders.
  const [mobileOpen, setMobileOpen] = useState(false);

  // The guided tour is a Manager/Agent onboarding feature — Admin never
  // sees it (no header button, no auto-start, no "Take the Platform Tour"
  // button on their Profile page), not just a filtered-down version of it,
  // so TourProvider/TourOverlay aren't even mounted for that role.
  const showTour = role !== "ADMIN";

  // Admin-only beta toggle (Profile page, "New Page Layout") — recolors
  // the sidebar to copper (see Sidebar.tsx) rather than changing main's
  // own shape, so flipping it never touches main content at all. Fetched
  // independently here rather than threaded down from the server layout,
  // same pattern Sidebar/TopBarActions already use for their own profile
  // reads, so flipping the toggle takes effect on next load without
  // touching the session/JWT.
  const [cardLayoutEnabled, setCardLayoutEnabled] = useState(false);
  useEffect(() => {
    if (role !== "ADMIN") return;
    fetch("/api/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.profile?.cardLayoutEnabled) setCardLayoutEnabled(true);
      });
  }, [role]);

  const mainContent = (
    <>
      <PageHeader onOpenMenu={() => setMobileOpen(true)} />
      <TopBarActions role={role} name={name} />
      {/* Continues the logo header's bottom edge across the content area
          with a copper accent. Lives inside the scrollable region (not
          viewport-fixed) so it scrolls away with the rest of the page
          instead of staying pinned over content that's scrolled
          underneath it. Omitted on Scripts/Commission Calculator — see
          HeaderDivider. */}
      <HeaderDivider />
      <ContentContainer>{children}</ContentContainer>
    </>
  );

  const shell = (
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      <NotificationToaster />
      <SoundEffects />
      <Sidebar
        role={role}
        name={name}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        cardLayoutEnabled={cardLayoutEnabled}
      />
      <main className="relative min-w-0 flex-1 overflow-y-auto px-4 pt-2 pb-8 sm:px-6 lg:px-10">
        {mainContent}
      </main>
      {showTour && <TourOverlay role={role} />}
    </div>
  );

  // Wraps the whole shell (not just TourOverlay) so page content — like the
  // "Take the Platform Tour" button on Profile — can also reach useTour().
  return showTour ? <TourProvider role={role}>{shell}</TourProvider> : shell;
}
