"use client";

import { useSyncExternalStore } from "react";
import Image from "next/image";
import * as atlasVoice from "@/lib/atlasVoice";

/** The Overview grid's A.T.L.A.S. tile — the agency's own reference photo
 *  (a glowing circular HUD with "A.T.L.A.S" already in it) rendered bare,
 *  not a bordered Card like its neighbors, so it reads as part of the page
 *  itself rather than a boxed widget (per explicit request). Pressing it
 *  both opens the Ask A.T.L.A.S. panel (reusing the exact same handler the
 *  real wake word already calls) and turns on hands-free mode, so "Hey
 *  Atlas" works right after without a separate step. The whole image slowly
 *  rotates and brightens while Atlas is actively listening or speaking —
 *  the photo's own rings are baked into its pixels, so a full-image spin
 *  stands in for animating them individually. */
export function AtlasHudWidget() {
  const voiceStatus = useSyncExternalStore(
    atlasVoice.subscribe,
    atlasVoice.getStatus,
    () => "off" as atlasVoice.VoiceStatus,
  );
  const active = voiceStatus === "capturing" || voiceStatus === "speaking";

  function activate() {
    if (voiceStatus === "off" || voiceStatus === "unsupported") {
      atlasVoice.enableHandsFree();
    }
    atlasVoice.triggerWakeManually();
  }

  return (
    <button
      type="button"
      onClick={activate}
      aria-label="Activate A.T.L.A.S. — or say Hey Atlas"
      title="Click, or say “Hey Atlas”"
      className="group relative mx-auto block aspect-square w-full max-w-[220px] cursor-pointer"
    >
      {/* Glow bloom behind the photo — brightens while active, a soft idle
          pulse/hover glow otherwise. */}
      <div
        className={`absolute inset-0 rounded-full blur-2xl transition-opacity duration-500 ${active ? "opacity-80" : "opacity-40 group-hover:opacity-60"}`}
        style={{
          background: "radial-gradient(circle, var(--copper-metal-hi) 0%, transparent 70%)",
        }}
      />
      <div
        className={`relative h-full w-full transition-[filter,transform] duration-500 ${
          active ? "scale-[1.04] animate-pulse brightness-125" : "brightness-100 group-hover:brightness-110"
        }`}
      >
        <Image src="/atlas/atlas-hud.webp" alt="" fill sizes="220px" className="rounded-lg object-contain" />
      </div>

      {/* Status caption — the photo already has "A.T.L.A.S" baked in, this
          just adds the live listening/speaking/idle cue underneath it. */}
      <div className="absolute inset-x-0 bottom-[-22px] flex justify-center">
        <span className="font-condensed text-[9px] font-bold tracking-[0.1em] text-copper uppercase opacity-80">
          {active ? (voiceStatus === "speaking" ? "Speaking…" : "Listening…") : "Press or say “Hey Atlas”"}
        </span>
      </div>
    </button>
  );
}
