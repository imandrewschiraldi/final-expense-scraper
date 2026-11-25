"use client";

import { useEffect, useState } from "react";
import { Sidebar, type SidebarProfile } from "@/components/portal/Sidebar";
import { PageHeader } from "@/components/portal/PageHeader";
import { HeaderDivider } from "@/components/portal/HeaderDivider";
import { TopBarActions } from "@/components/portal/TopBarActions";
import { ContentContainer } from "@/components/portal/ContentContainer";
import { NotificationToaster } from "@/components/portal/NotificationToaster";
import { SoundEffects } from "@/components/portal/SoundEffects";
import { TourProvider } from "@/components/tour/TourProvider";
import { TourOverlay } from "@/components/tour/TourOverlay";
import { CARD_LAYOUT_CHANGED_EVENT } from "@/lib/cardLayoutEvent";
import { cn } from "@/lib/cn";

type Role = "ADMIN" | "MANAGER" | "AGENT";

/** Shared shell for every authenticated area (Portal, Agent, Admin) — one
 * copy of the sidebar + main content frame instead of three near-identical
 * layout files, so a shell-level fix (like the header divider below) only
 * needs to happen once. */
export function AppShell({
  role,
  name,
  initialSidebarProfile,
  children,
}: {
  role: Role;
  name: string;
  // Fetched server-side (see app/(portal)/layout.tsx) and passed straight
  // through to Sidebar — see its own prop doc for why this needs to come
  // from the server instead of Sidebar's own client-side fetch alone.
  initialSidebarProfile?: SidebarProfile | null;
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

  // Admin-only beta toggle (Profile page, "New Page Layout") — swaps
  // main's full-bleed column for a rounded, shadowed, slightly inset card
  // instead, with the sidebar dropping its own border/copper-line to
  // match (see Sidebar.tsx). Both the card and the sidebar/page behind it
  // are built from theme CSS variables (--overlay-card-surface/
  // --background/--border — see globals.css), so the card reads as a
  // clearly different shade from the matching sidebar/page color behind
  // it in dark, light, and green alike, rather than needing its own
  // per-theme logic here.
  // Seeded from initialSidebarProfile (fetched server-side, same object
  // Sidebar's own nav-gating flags ride in on) rather than starting false
  // and waiting on the client-side fetch below — this toggle changes the
  // WHOLE page shell (main's height/overflow, the sidebar's border), so
  // starting false on every refresh meant briefly rendering the old
  // full-bleed layout, border and all, before snapping into the overlay
  // card a beat later. The fetch and event listener below still run after
  // mount, to pick up a flag flipped on the Profile page in this same
  // session without a full reload.
  const [cardLayoutEnabled, setCardLayoutEnabled] = useState(
    initialSidebarProfile?.cardLayoutEnabled ?? false,
  );
  useEffect(() => {
    if (role !== "ADMIN") return;
    fetch("/api/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.profile?.cardLayoutEnabled) setCardLayoutEnabled(true);
      });
  }, [role]);
  useEffect(() => {
    if (role !== "ADMIN") return;
    function onChange(e: Event) {
      setCardLayoutEnabled(Boolean((e as CustomEvent<boolean>).detail));
    }
    window.addEventListener(CARD_LAYOUT_CHANGED_EVENT, onChange);
    return () =>
      window.removeEventListener(CARD_LAYOUT_CHANGED_EVENT, onChange);
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
        initialProfile={initialSidebarProfile}
      />
      <main
        className={cn(
          "relative min-w-0 flex-1",
          // The card itself is the thing that should stay put as a fixed
          // overlay frame — only the page inside it scrolls. That needs
          // main pinned to exactly one viewport tall with nothing escaping
          // it (no scrolling of its own), so the card's own h-full +
          // overflow-y-auto below is what actually moves, not this.
          cardLayoutEnabled
            ? "h-screen overflow-hidden p-2 sm:p-3 lg:p-4"
            : "overflow-y-auto px-4 pt-2 pb-8 sm:px-6 lg:px-10",
        )}
      >
        {cardLayoutEnabled ? (
          // No outer drop shadow — its blur bled past the small gap into
          // the sidebar, reading as a dividing line between the sidebar
          // and the matching page color behind the card, exactly what this
          // layout is trying not to have. Only an inset top highlight,
          // which (unlike a drop shadow) is clipped to the card's own box
          // and can never bleed outside it.
          <div className="relative h-full overflow-y-auto rounded-[20px] border border-border bg-[linear-gradient(to_bottom,var(--overlay-card-surface),var(--background))] px-4 pt-2 pb-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:px-6 lg:px-10">
            {mainContent}
          </div>
        ) : (
          mainContent
        )}
      </main>
      {showTour && <TourOverlay role={role} />}
    </div>
  );

  // Wraps the whole shell (not just TourOverlay) so page content — like the
  // "Take the Platform Tour" button on Profile — can also reach useTour().
  return showTour ? <TourProvider role={role}>{shell}</TourProvider> : shell;
}
