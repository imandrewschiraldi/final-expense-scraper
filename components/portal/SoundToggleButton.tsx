"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useSoundEnabled } from "@/lib/useSoundEnabled";

/** Compact icon-only version for the top-right action bar — the sidebar
 *  footer used to carry a labeled full-width button, but this lives
 *  alongside Notifications/Tour/Sign Out now, where icon-only matches. */
export function SoundToggleButton() {
  const [soundEnabled, setSoundEnabled] = useSoundEnabled();

  return (
    <button
      type="button"
      data-tour="sound-toggle"
      onClick={() => setSoundEnabled(!soundEnabled)}
      aria-label={soundEnabled ? "Mute sounds" : "Unmute sounds"}
      title={soundEnabled ? "Mute sounds" : "Unmute sounds"}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-[1.5px] border-copper-dim text-muted transition-colors hover:border-copper hover:text-foreground"
    >
      {soundEnabled ? <Volume2 className="h-4.5 w-4.5" /> : <VolumeX className="h-4.5 w-4.5" />}
    </button>
  );
}
