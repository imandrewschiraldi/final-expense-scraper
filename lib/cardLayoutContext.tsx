"use client";

import { createContext, useContext } from "react";

// Whether AppShell is currently rendering the overlay-card beta's rounded
// frame around this page — provided from AppShell itself, consumed by
// EmbeddedTool (Scripts/Commission Calculator) so its iframe can fill flush
// to the card's own edges instead of the browser window's when the card is
// showing, rather than needing to know about AppShell's internal layout
// directly. Defaults false so anything rendered outside AppShell (there
// isn't anything today, but just in case) gets the plain non-card behavior.
const CardLayoutContext = createContext(false);

export function CardLayoutProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <CardLayoutContext.Provider value={enabled}>
      {children}
    </CardLayoutContext.Provider>
  );
}

export function useCardLayout(): boolean {
  return useContext(CardLayoutContext);
}
