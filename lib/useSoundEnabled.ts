"use client";

import { useCallback, useEffect, useState } from "react";
import { isSoundEnabled, setSoundEnabled, SOUND_ENABLED_EVENT } from "@/lib/sounds";

/** Per-device click/notification sound preference — on by default, with a
 *  toggle in the sidebar (see SidebarFooter) the only way to mute it. Mirrors
 *  useWideLayout's localStorage + custom-event pattern so every mounted
 *  consumer (just the toggle button today) stays in sync. */
export function useSoundEnabled(): [boolean, (next: boolean) => void] {
  // Starts true to match the default (SSR has no access to localStorage)
  // and syncs from persisted state right after mount.
  const [enabled, setEnabledState] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnabledState(isSoundEnabled());
    function onChange() {
      setEnabledState(isSoundEnabled());
    }
    window.addEventListener(SOUND_ENABLED_EVENT, onChange);
    return () => window.removeEventListener(SOUND_ENABLED_EVENT, onChange);
  }, []);

  const setEnabled = useCallback((next: boolean) => {
    setSoundEnabled(next);
  }, []);

  return [enabled, setEnabled];
}
