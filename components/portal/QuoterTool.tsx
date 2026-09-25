"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/cn";

const QUOTE_TOOLS = {
  FINAL_EXPENSE: {
    label: "FEX Quoter",
    src: "https://app.insurancetoolkits.com/fex/lite?token=zfq-hD_l8Am4ZasAkK7HZuR5wS2BHJijhzgMnzmc",
  },
  TERM_LIFE: {
    label: "Term Quoter",
    src: "https://app.insurancetoolkits.com/term/lite?token=zfq-hD_l8Am4ZasAkK7HZuR5wS2BHJijhzgMnzmc",
  },
} as const;

type QuoteToolKey = keyof typeof QUOTE_TOOLS;

/**
 * Two third-party quoting tools switched by a button bar and embedded via
 * iframe. Unlike Scripts/Commission Calculator, these aren't Tier 1's own
 * tools, so there's no "?embed=1" mode to hide their branding — each one
 * just iframes as-is, light mode only (an earlier Dark Mode option, a CSS
 * invert() filter, was tried and dropped by request).
 *
 * `key={active}` on the iframe forces a full remount when switching tools,
 * so the previous one doesn't linger mounted (and mid-quote) invisibly in
 * the background.
 *
 * Unlike Scripts/Commission Calculator, this doesn't bleed up under the
 * page header — those tools render their own copper line inside their
 * embed, this one doesn't, so it sits below the shell's normal copper
 * divider instead (see HeaderDivider). On desktop the mobile-only
 * PageHeader (see PageHeader.tsx) contributes zero height, so `main`'s
 * content starts right after its own 8px top padding while the divider
 * line sits pinned 74px down — every PageHeading-based page fills that
 * 66px gap with its own top margin + wordmark height, so this needs the
 * same `lg:mt-[66px]` or its content renders above the line instead of
 * below it. Also gets a bounded height rather than the full remaining
 * viewport, scrolling internally if the embedded tool's own content runs
 * taller.
 */
export function QuoterTool() {
  const [active, setActive] = useState<QuoteToolKey>("FINAL_EXPENSE");
  const tool = QUOTE_TOOLS[active];

  return (
    <div className="relative -mx-4 -mb-8 flex h-[70vh] flex-col sm:-mx-6 lg:mt-[66px] lg:-mx-10">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-surface px-4 py-3 sm:px-6 lg:px-10">
        <div className="flex items-center gap-2">
          {(Object.keys(QUOTE_TOOLS) as QuoteToolKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setActive(key)}
              className={cn(
                "font-condensed rounded-lg border-[1.5px] px-4 py-2 text-[13px] font-bold tracking-[0.05em] uppercase transition-colors",
                active === key
                  ? "border-copper bg-copper text-black"
                  : "border-border text-muted hover:border-copper hover:text-foreground",
              )}
            >
              {QUOTE_TOOLS[key].label}
            </button>
          ))}
        </div>
        <a
          href={tool.src}
          target="_blank"
          rel="noopener noreferrer"
          className="font-condensed flex items-center gap-1.5 rounded-lg border-[1.5px] border-border px-3 py-2 text-[13px] font-bold tracking-[0.05em] text-muted uppercase transition-colors hover:border-copper hover:text-foreground"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Open in New Tab</span>
        </a>
      </div>

      <div className="relative flex-1 overflow-hidden bg-white">
        <iframe key={active} src={tool.src} title={tool.label} className="h-full w-full border-0" />
      </div>
    </div>
  );
}
