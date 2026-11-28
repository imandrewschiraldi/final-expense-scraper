"use client";

import { useSyncExternalStore } from "react";
import * as atlasVoice from "@/lib/atlasVoice";

/** The Overview grid's A.T.L.A.S. tile — a glowing circular HUD, not a
 *  bordered Card like its neighbors, so it reads as part of the page
 *  itself rather than a boxed widget (per explicit request). Pressing it
 *  both opens the Ask A.T.L.A.S. panel (reusing the exact same handler the
 *  real wake word already calls) and turns on hands-free mode, so "Hey
 *  Atlas" works right after without a separate step. Its glow reacts live
 *  to the same voice status the header pill shows. */
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
      {/* Outer glow bloom — brightens and widens while Atlas is actively
          listening to or speaking a reply, a slow idle pulse otherwise. */}
      <div
        className={`absolute inset-0 rounded-full blur-2xl transition-opacity duration-500 ${active ? "opacity-90" : "opacity-50 group-hover:opacity-70"}`}
        style={{
          background:
            "radial-gradient(circle, var(--copper-metal-hi) 0%, var(--copper-metal) 40%, transparent 72%)",
        }}
      />
      <svg viewBox="0 0 200 200" className="relative h-full w-full">
        <defs>
          <radialGradient id="atlas-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--copper-metal-hi)" />
            <stop offset="45%" stopColor="var(--copper-metal)" />
            <stop offset="100%" stopColor="var(--copper-metal-dk)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Core glow disc */}
        <circle cx="100" cy="100" r="70" fill="url(#atlas-core)" opacity={active ? 0.95 : 0.65} />

        {/* Slow-rotating tick ring — the "always-on tech" read */}
        <g
          className={active ? "animate-[spin_4s_linear_infinite]" : "animate-[spin_18s_linear_infinite]"}
          style={{ transformOrigin: "100px 100px" }}
        >
          {Array.from({ length: 36 }).map((_, i) => {
            const angle = (i * 360) / 36;
            const long = i % 3 === 0;
            return (
              <line
                key={i}
                x1="100"
                y1={long ? "8" : "14"}
                x2="100"
                y2="20"
                stroke="var(--copper-metal-hi)"
                strokeWidth={long ? 2 : 1}
                opacity={long ? 0.9 : 0.5}
                transform={`rotate(${angle} 100 100)`}
              />
            );
          })}
        </g>

        {/* Fixed outer + inner frame rings */}
        <circle cx="100" cy="100" r="92" fill="none" stroke="var(--copper-metal)" strokeWidth="1.5" opacity="0.6" />
        <circle cx="100" cy="100" r="78" fill="none" stroke="var(--copper-metal-hi)" strokeWidth="1" opacity="0.4" />

        {/* A bright swept arc, like a radar sweep — faster and brighter while active */}
        <circle
          cx="100"
          cy="100"
          r="85"
          fill="none"
          stroke="var(--copper-metal-hi)"
          strokeWidth="3"
          strokeDasharray="40 500"
          opacity={active ? 1 : 0.7}
          className={active ? "animate-[spin_2.5s_linear_infinite]" : "animate-[spin_8s_linear_infinite]"}
          style={{ transformOrigin: "100px 100px" }}
        />
      </svg>

      {/* Center label, on top of everything */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-condensed text-lg font-extrabold tracking-[0.15em] text-white uppercase drop-shadow-[0_0_8px_rgba(202,126,64,0.8)]">
          Atlas
        </span>
        <span className="font-condensed mt-1 text-[9px] font-bold tracking-[0.1em] text-copper uppercase opacity-80">
          {active ? (voiceStatus === "speaking" ? "Speaking…" : "Listening…") : "Press or say “Hey Atlas”"}
        </span>
      </div>
    </button>
  );
}
