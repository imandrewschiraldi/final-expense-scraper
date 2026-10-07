"use client";

import { useEffect } from "react";
import { playClickSound } from "@/lib/sounds";

// Delegated at the document level (one listener for the whole app) rather
// than wiring an onClick into every button/link/toggle individually — new
// interactive elements get the sound for free without being touched.
const INTERACTIVE_SELECTOR = 'button, a[href], [role="button"], input[type="checkbox"], input[type="radio"], select, summary';

/** Mounted once in AppShell. Plays a soft click for any click landing on a
 *  button, link, toggle, tab, etc. anywhere in the authenticated app. */
export function SoundEffects() {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      const el = target?.closest(INTERACTIVE_SELECTOR) as HTMLButtonElement | HTMLInputElement | null;
      if (!el || el.disabled) return;
      playClickSound();
    }
    // Capture phase so the sound still plays even if a handler further down
    // stops propagation before it reaches a bubble-phase listener here.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
