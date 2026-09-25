"use client";

import { useState } from "react";
import { ExternalLink, Sun, Columns2, Moon } from "lucide-react";
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

const VIEW_MODES = {
  LIGHT: { label: "Light", icon: Sun },
  SPLIT: { label: "Split", icon: Columns2 },
  DARK: { label: "Dark", icon: Moon },
} as const;

type ViewMode = keyof typeof VIEW_MODES;

const INVERT_STYLE = { filter: "invert(1) hue-rotate(180deg)" };

/**
 * Two third-party quoting tools switched by a button bar and embedded via
 * iframe. Unlike Scripts/Commission Calculator, these aren't Tier 1's own
 * tools, so there's no "?embed=1" mode to hide their branding — each one
 * just iframes as-is.
 *
 * Dark is a CSS invert() applied to the iframe, not a real theme from the
 * tool (it doesn't offer one) — a rough approximation that can make any
 * logos/photos on their end look inverted too. It's the default view. The
 * ask was for the inputs/heading to stay dark but the generated quote
 * itself to switch back to light automatically — not achievable: the tool
 * is a cross-origin site, so there's no way to observe anything happening
 * inside it (a click, a navigation, a state change) from out here, and the
 * filter can only apply to the iframe as one uniform block for as long as
 * it's mounted. Switching to Light for the results has to be a manual
 * click on the toggle. Split shows it twice, side by side, one plain and
 * one inverted — genuinely two separate iframes (two independent page
 * loads of the same tool), not one iframe visually cut in half, since a
 * cross-origin site can't be clipped/mirrored from outside. That means the
 * two halves don't stay in sync — filling in a quote on one side never
 * appears on the other.
 *
 * `key={active}` on every iframe forces a full remount when switching
 * tools, so the previous one doesn't linger mounted (and mid-quote)
 * invisibly in the background.
 *
 * Unlike Scripts/Commission Calculator, this doesn't bleed up under the
 * page header — those tools render their own copper line inside their
 * embed, this one doesn't, so it sits below the shell's normal copper
 * divider instead (see HeaderDivider) and gets a bounded height rather
 * than the full remaining viewport, scrolling internally if the embedded
 * tool's own content runs taller.
 */
export function QuoterTool() {
  const [active, setActive] = useState<QuoteToolKey>("FINAL_EXPENSE");
  const [viewMode, setViewMode] = useState<ViewMode>("DARK");
  const tool = QUOTE_TOOLS[active];

  return (
    <div className="relative -mx-4 -mb-8 flex h-[70vh] flex-col sm:-mx-6 lg:-mx-10">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-surface px-4 py-3 sm:px-6 lg:px-10">
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
        <div className="flex items-center gap-1.5 rounded-lg border-[1.5px] border-border p-0.5">
          {(Object.keys(VIEW_MODES) as ViewMode[]).map((key) => {
            const Icon = VIEW_MODES[key].icon;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setViewMode(key)}
                title={key === "SPLIT" ? "Two independent copies side by side — they won't stay in sync" : undefined}
                className={cn(
                  "font-condensed flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-bold tracking-[0.05em] uppercase transition-colors",
                  viewMode === key ? "bg-copper text-black" : "text-muted hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{VIEW_MODES[key].label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative flex flex-1 overflow-hidden">
        {viewMode === "SPLIT" ? (
          <>
            <div className="h-full w-1/2 bg-white">
              <iframe key={`${active}-light`} src={tool.src} title={`${tool.label} (light)`} className="h-full w-full border-0" />
            </div>
            <div className="h-full w-1/2 border-l border-border bg-black">
              <iframe
                key={`${active}-dark`}
                src={tool.src}
                title={`${tool.label} (dark)`}
                className="h-full w-full border-0"
                style={INVERT_STYLE}
              />
            </div>
          </>
        ) : (
          <div className={cn("h-full w-full", viewMode === "DARK" ? "bg-black" : "bg-white")}>
            <iframe
              key={active}
              src={tool.src}
              title={tool.label}
              className="h-full w-full border-0"
              style={viewMode === "DARK" ? INVERT_STYLE : undefined}
            />
          </div>
        )}
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
