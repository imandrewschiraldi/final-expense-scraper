"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "portal-theme";
// Mirrors useWideLayout's localStorage + custom-event pattern so every
// mounted consumer (just the toggle button in TopBarActions today) stays
// in sync the instant it changes, without a shared React context.
const EVENT_NAME = "portal-theme-change";

export type Theme = "dark" | "light";

function readStored(): Theme {
  if (typeof window === "undefined") return "dark";
  return localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
}

function applyTheme(theme: Theme) {
  if (theme === "light") {
    document.documentElement.setAttribute("data-theme", "light");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

/** Per-device dark/light preference — dark by default (today's look,
 *  unchanged for everyone who hasn't touched it), flipped from
 *  TopBarActions' header row. The actual theme CSS lives in globals.css
 *  under `:root[data-theme="light"]`; this hook only ever sets or clears
 *  that attribute on <html> and persists the choice. See the inline
 *  script in app/layout.tsx for the no-flash-on-load version of this same
 *  read, which runs before React hydrates. */
export function useTheme(): [Theme, (next: Theme) => void] {
  // Starts "dark" to match SSR (no access to localStorage there) and
  // syncs from persisted state right after mount, same pattern Sidebar's
  // own collapsed state already uses.
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(readStored());
    function onChange() {
      setThemeState(readStored());
    }
    window.addEventListener(EVENT_NAME, onChange);
    return () => window.removeEventListener(EVENT_NAME, onChange);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
    window.dispatchEvent(new Event(EVENT_NAME));
  }, []);

  return [theme, setTheme];
}
