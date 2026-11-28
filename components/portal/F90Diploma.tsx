"use client";

import { useState } from "react";
import Image from "next/image";
import { Playfair_Display, Pacifico } from "next/font/google";
import { Lock, GraduationCap, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { F90_GRADUATION_AP } from "@/lib/f90Content";
import { Confetti } from "@/components/portal/F90Panel";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["400", "700", "900"] });
const pacifico = Pacifico({ subsets: ["latin"], weight: "400" });

const GOLD = "#c9a646";
const GOLD_LIGHT = "#e9d9a8";
const GOLD_DARK = "#8a6d26";

function DiplomaFace({ agentName, issuedAP }: { agentName: string; issuedAP: number }) {
  const today = new Date();
  return (
    <div
      className="relative mx-auto aspect-[11/8.5] w-full max-w-3xl overflow-hidden p-2"
      style={{ background: GOLD, borderRadius: 10 }}
    >
      <div
        className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden px-6 py-6 text-center sm:px-12 sm:py-8"
        style={{
          background: "#fbf6e9",
          border: `2px solid ${GOLD_DARK}`,
          borderRadius: 4,
        }}
      >
        {/* Watermark crest, behind everything */}
        <GraduationCap
          className="pointer-events-none absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 opacity-[0.05]"
          style={{ color: GOLD_DARK }}
        />

        <Image
          src="/tier1-logo-transparent.png"
          alt=""
          width={1560}
          height={558}
          className="relative mb-2 h-10 w-auto object-contain sm:h-12"
        />
        <p
          className={`${playfair.className} relative text-[10px] font-bold tracking-[0.3em] uppercase sm:text-xs`}
          style={{ color: GOLD_DARK }}
        >
          Tier 1 Financial F90 University
        </p>
        <h2
          className={`${playfair.className} relative mt-1 text-xl font-black tracking-wide text-[#2a2316] sm:text-3xl`}
        >
          Certificate of Graduation
        </h2>

        <p className={`${playfair.className} relative mt-4 text-xs text-[#2a2316]/70 italic sm:text-sm`}>
          This certifies that
        </p>
        <p className={`${pacifico.className} relative mt-2 text-3xl sm:text-4xl`} style={{ color: GOLD_DARK }}>
          {agentName}
        </p>

        <p
          className={`${playfair.className} relative mt-4 max-w-md text-xs text-[#2a2316] sm:text-sm`}
        >
          Has successfully completed the First 90-Day Sales Mastery Roadmap and issued{" "}
          <strong>{`$${Math.round(issuedAP).toLocaleString()}+`}</strong> in Annual Premium.
        </p>

        <div className="relative mt-4 flex items-center gap-2">
          <span
            className="rounded-full px-3 py-1 text-[10px] font-extrabold tracking-wide text-[#2a2316] uppercase sm:text-xs"
            style={{ background: GOLD_LIGHT, border: `1px solid ${GOLD_DARK}` }}
          >
            {`$${Math.round(issuedAP).toLocaleString()} Issued Annual Premium`}
          </span>
        </div>

        <p className={`${playfair.className} relative mt-4 text-xs text-[#2a2316]/80 sm:text-sm`}>
          {today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </p>

        {/* Embossed seal */}
        <div
          className="absolute right-4 bottom-4 flex h-14 w-14 items-center justify-center rounded-full sm:h-16 sm:w-16"
          style={{
            background: `radial-gradient(circle at 35% 30%, ${GOLD_LIGHT}, ${GOLD} 60%, ${GOLD_DARK})`,
            boxShadow: "inset 0 1px 2px rgba(255,255,255,0.6), inset 0 -2px 4px rgba(0,0,0,0.3), 0 2px 6px rgba(0,0,0,0.3)",
          }}
        >
          <GraduationCap className="h-6 w-6 text-[#3a2d10] sm:h-7 sm:w-7" />
        </div>

        {/* Signature */}
        <div className="absolute bottom-4 left-6 flex flex-col items-center sm:left-10">
          <p className={`${pacifico.className} text-lg sm:text-xl`} style={{ color: "#2a2316" }}>
            Tier 1 Financial
          </p>
          <div className="mt-0.5 h-px w-28 sm:w-32" style={{ background: GOLD_DARK }} />
          <p className={`${playfair.className} mt-0.5 text-[9px] text-[#2a2316]/70 italic sm:text-[10px]`}>
            Agency Owner
          </p>
        </div>
      </div>
    </div>
  );
}

export function F90Diploma({
  agentName,
  issuedAP,
  eligible,
}: {
  agentName: string;
  issuedAP: number;
  eligible: boolean;
}) {
  const [previewing, setPreviewing] = useState(false);
  const [celebrationKey, setCelebrationKey] = useState(0);
  const unlocked = eligible || previewing;
  const remaining = Math.max(0, F90_GRADUATION_AP - issuedAP);

  return (
    <div className="relative rounded-2xl border-2 p-6 sm:p-10" style={{ borderColor: "#141414", background: "#ffffff" }}>
      <p className="mb-6 text-center text-sm font-extrabold tracking-[0.3em] uppercase" style={{ color: "#b5551e" }}>
        Final Destination
      </p>

      <div className="relative">
        {unlocked && (
          <div key={celebrationKey} className="pointer-events-none absolute inset-0 z-20">
            <Confetti />
            <div className="absolute inset-0 overflow-hidden rounded-xl">
              <div
                className="animate-f90-shimmer absolute top-0 bottom-0 w-1/3"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.65), transparent)",
                }}
              />
            </div>
          </div>
        )}

        <div style={{ filter: unlocked ? "none" : "blur(6px) grayscale(0.4) brightness(0.75)" }}>
          <DiplomaFace agentName={agentName} issuedAP={issuedAP} />
        </div>

        {!unlocked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/50 px-4 text-center">
            <Lock className="h-8 w-8 text-[#ffffff]/80" />
            <p className="font-condensed text-sm font-extrabold tracking-wide text-[#ffffff] uppercase">
              {`$${Math.round(remaining).toLocaleString()} in Issued Annual Premium to go`}
            </p>
            <p className="max-w-xs text-xs text-[#ffffff]/60">
              Complete every Phase 1–4 step and reach $
              {F90_GRADUATION_AP.toLocaleString()} in Issued Annual Premium to unlock
              your diploma.
            </p>
            <Button variant="ghost" onClick={() => setPreviewing(true)}>
              Preview Graduation
            </Button>
          </div>
        )}
      </div>

      {unlocked && (
        <div className="relative z-30 mt-6 flex flex-wrap items-center justify-center gap-3">
          <div
            key={`crest-${celebrationKey}`}
            className="animate-f90-crest flex items-center gap-2 rounded-full px-4 py-1.5"
            style={{ background: GOLD, color: "#2a2316" }}
          >
            <GraduationCap className="h-4 w-4" />
            <span className="text-xs font-extrabold tracking-wide uppercase">F90 Graduate</span>
          </div>
          <Button variant="ghost" onClick={() => setCelebrationKey((k) => k + 1)}>
            Replay Celebration
          </Button>
          {eligible && (
            <a
              href="/api/portal/f90/certificate"
              className="inline-flex items-center gap-2 rounded-md border-[1.5px] border-border px-4 py-2 text-[13px] font-bold tracking-[0.08em] text-muted uppercase transition-colors hover:border-copper-dim-gradient hover:text-foreground"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </a>
          )}
          {previewing && !eligible && (
            <Button variant="ghost" onClick={() => setPreviewing(false)}>
              Exit Preview
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
