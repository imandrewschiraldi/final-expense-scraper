"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/cn";
import { UnderwritingGenie } from "@/components/portal/underwriting/UnderwritingGenie";

const QUOTE_TOOLS = {
  FINAL_EXPENSE: {
    label: "FEX Quoter",
    src: "https://app.insurancetoolkits.com/fex/lite?token=i_Eren7OQecbZoJlQWWM4uWF4TrjCb4sZ2Io42DO",
  },
  TERM_LIFE: {
    label: "Term Quoter",
    src: "https://app.insurancetoolkits.com/term/lite?token=i_Eren7OQecbZoJlQWWM4uWF4TrjCb4sZ2Io42DO",
  },
  IUL: {
    label: "IUL Quoter",
    src: "https://app.insurancetoolkits.com/iul/lite?token=i_Eren7OQecbZoJlQWWM4uWF4TrjCb4sZ2Io42DO",
  },
} as const;

type QuoteToolKey = keyof typeof QUOTE_TOOLS;
// A fourth tab alongside the three iframed quoters — Tier 1's own tool, so
// it renders directly (no src/iframe) rather than through QUOTE_TOOLS.
const GENIE_TAB = "UNDERWRITING_GENIE" as const;
type TabKey = QuoteToolKey | typeof GENIE_TAB;

const TAB_ORDER: { key: TabKey; label: string }[] = [
  ...(Object.keys(QUOTE_TOOLS) as QuoteToolKey[]).map((key) => ({ key, label: QUOTE_TOOLS[key].label })),
  { key: GENIE_TAB, label: "Underwriting Genie" },
];

/**
 * Three third-party quoting tools plus Underwriting Genie (Tier 1's own,
 * rendered directly), switched by one button bar. The quoters aren't Tier
 * 1's own tools, so there's no "?embed=1" mode to hide their branding —
 * each one just iframes as-is, light mode only (an earlier Dark Mode
 * option, a CSS invert() filter, was tried and dropped by request).
 *
 * `key={active}` on the iframe forces a full remount when switching
 * quoters, so the previous one doesn't linger mounted (and mid-quote)
 * invisibly in the background.
 *
 * The quoters get a bounded height, scrolling internally like the
 * embedded tool's own content runs taller. Underwriting Genie's content
 * is its own React tree, not an iframe, and can run much taller than a
 * quoter (a full results grid) — so it drops the fixed height/iframe
 * shell and just grows with the page instead of scrolling in a box.
 *
 * Underwriting Genie stays mounted (hidden via CSS, not unmounted) even
 * while a quoter tab is active — unlike the iframes' deliberate
 * remount-on-switch, re-entering a client's full medical history after
 * tabbing over for a quick quote would be a real cost, so its form state
 * and results survive switching away and back.
 *
 * Sits in the normal reading-width column below its own graphic
 * PageHeading (see quoter/page.tsx) — unlike Scripts/Commission Calculator,
 * which have no heading and bleed their iframe to the viewport edges
 * instead.
 */
export function QuoterTool() {
  const [active, setActive] = useState<TabKey>("FINAL_EXPENSE");
  const isGenie = active === GENIE_TAB;
  const tool = isGenie ? null : QUOTE_TOOLS[active];

  return (
    <div className={cn("relative mb-8 flex flex-col overflow-hidden rounded-lg border border-border", !isGenie && "h-[70vh]")}>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-surface px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {TAB_ORDER.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActive(key)}
              className={cn(
                "font-condensed rounded-lg border-[1.5px] px-4 py-2 text-[13px] font-bold tracking-[0.05em] uppercase transition-colors",
                active === key
                  ? "toggle-pill-active"
                  : "border-border text-muted hover:border-copper hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {tool && (
          <a
            href={tool.src}
            target="_blank"
            rel="noopener noreferrer"
            className="font-condensed flex items-center gap-1.5 rounded-lg border-[1.5px] border-border px-3 py-2 text-[13px] font-bold tracking-[0.05em] text-muted uppercase transition-colors hover:border-copper hover:text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Open in New Tab</span>
          </a>
        )}
      </div>

      {tool && (
        <div className="relative flex-1 overflow-hidden bg-white">
          <iframe key={active} src={tool.src} title={tool.label} className="h-full w-full border-0" />
        </div>
      )}
      <div className={cn("bg-background p-5", !isGenie && "hidden")}>
        <UnderwritingGenie />
      </div>
    </div>
  );
}
