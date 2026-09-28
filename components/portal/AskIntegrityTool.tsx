"use client";

import { ExternalLink } from "lucide-react";

const ASK_INTEGRITY_URL = "https://connect.integrity.com/agent/ask-integrity/sales-coach";

/**
 * A single third-party tool embedded via iframe — same shape as QuoterTool
 * (bounded height, header bar with an "Open in New Tab" fallback, light
 * mode only), just without the multi-tool switcher since there's only one
 * source here. Integrity isn't Tier 1's own tool, so there's no "?embed=1"
 * mode to request — it iframes as-is, same as the Quote Tool's embeds.
 */
export function AskIntegrityTool() {
  return (
    <div className="relative mb-8 flex h-[70vh] flex-col overflow-hidden rounded-lg border border-border">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-surface px-4 py-3">
        <span className="font-condensed text-[13px] font-bold tracking-[0.05em] text-muted uppercase">
          Ask Integrity
        </span>
        <a
          href={ASK_INTEGRITY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-condensed flex items-center gap-1.5 rounded-lg border-[1.5px] border-border px-3 py-2 text-[13px] font-bold tracking-[0.05em] text-muted uppercase transition-colors hover:border-copper hover:text-foreground"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Open in New Tab</span>
        </a>
      </div>

      <div className="relative flex-1 overflow-hidden bg-white">
        <iframe src={ASK_INTEGRITY_URL} title="Ask Integrity" className="h-full w-full border-0" />
      </div>
    </div>
  );
}
