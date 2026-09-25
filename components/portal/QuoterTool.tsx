"use client";

import { useState } from "react";
import { ExternalLink, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";

const QUOTE_TOOLS = {
  FINAL_EXPENSE: {
    label: "Final Expense",
    src: "https://app.insurancetoolkits.com/fex/lite?token=zfq-hD_l8Am4ZasAkK7HZuR5wS2BHJijhzgMnzmc",
  },
  TERM_LIFE: {
    label: "Term Life",
    src: "https://app.insurancetoolkits.com/term/lite?token=zfq-hD_l8Am4ZasAkK7HZuR5wS2BHJijhzgMnzmc",
  },
} as const;

type QuoteToolKey = keyof typeof QUOTE_TOOLS;

/**
 * Two third-party quoting tools switched by a button bar and embedded via
 * iframe. Unlike Scripts/Commission Calculator, these aren't Tier 1's own
 * tools, so there's no "?embed=1" mode to hide their branding — each one
 * just iframes as-is. `key={active}` on the iframe forces a full remount on
 * switch, so the previous tool doesn't linger mounted (and mid-quote)
 * invisibly in the background.
 *
 * Dark Mode is a CSS invert() applied to the iframe itself, not a real
 * theme from the tool (it doesn't offer one) — a rough approximation that
 * can make any logos/photos on their end look inverted too, so it's an
 * opt-in toggle rather than always on.
 */
export function QuoterTool() {
  const [active, setActive] = useState<QuoteToolKey>("FINAL_EXPENSE");
  const [darkMode, setDarkMode] = useState(false);
  const tool = QUOTE_TOOLS[active];

  return (
    <div className="relative -mx-4 -mb-8 flex h-[calc(100dvh-74px)] flex-col sm:-mx-6 lg:-mx-10 lg:-mt-2 lg:h-screen">
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
        <button
          type="button"
          onClick={() => setDarkMode((d) => !d)}
          title="Approximated with a color filter — the tool itself has no dark mode"
          className={cn(
            "font-condensed flex items-center gap-1.5 rounded-lg border-[1.5px] px-3 py-2 text-[13px] font-bold tracking-[0.05em] uppercase transition-colors",
            darkMode
              ? "border-copper bg-copper text-black"
              : "border-border text-muted hover:border-copper hover:text-foreground",
          )}
        >
          {darkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">Dark Mode</span>
        </button>
      </div>

      <div className={cn("relative flex-1 overflow-hidden", darkMode ? "bg-black" : "bg-white")}>
        <iframe
          key={active}
          src={tool.src}
          title={tool.label}
          className="h-full w-full border-0"
          style={darkMode ? { filter: "invert(1) hue-rotate(180deg)" } : undefined}
        />
        <a
          href={tool.src}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-3 left-3 flex items-center gap-1.5 rounded-md bg-black/60 px-2.5 py-1.5 text-xs font-semibold text-muted backdrop-blur-sm transition-colors hover:text-white"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open in New Tab
        </a>
      </div>
    </div>
  );
}
