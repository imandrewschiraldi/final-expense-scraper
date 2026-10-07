"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "portal-wide-layout";
// Fires on every localStorage write (not just cross-tab ones, which is all
// the native "storage" event covers) so every mounted consumer — the
// Sidebar toggle button and every page's ContentContainer — stays in sync
// the instant one of them changes it, without needing a shared React
// context across components that aren't otherwise related.
const EVENT_NAME = "portal-wide-layout-change";

function readStored(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) === "true";
}

/** Per-device "use more of the screen" preference for large/widescreen
 *  monitors — off by default (preserves the normal centered reading width
 *  everyone else gets), opt-in per browser like the sidebar's own collapse
 *  state. Widens ContentContainer's max-width; the Sidebar's toggle button
 *  is the only place that flips it. */
export function useWideLayout(): [boolean, (next: boolean) => void] {
  // Starts false to match SSR (no access to localStorage there) and syncs
  // from persisted state right after mount, same pattern Sidebar's own
  // collapsed state already uses.
  const [wide, setWideState] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWideState(readStored());
    function onChange() {
      setWideState(readStored());
    }
    window.addEventListener(EVENT_NAME, onChange);
    return () => window.removeEventListener(EVENT_NAME, onChange);
  }, []);

  const setWide = useCallback((next: boolean) => {
    localStorage.setItem(STORAGE_KEY, String(next));
    window.dispatchEvent(new Event(EVENT_NAME));
  }, []);

  return [wide, setWide];
}
