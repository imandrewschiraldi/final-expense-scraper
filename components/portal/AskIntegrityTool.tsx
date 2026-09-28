import { ExternalLink, Bot } from "lucide-react";
import { AccentCard } from "@/components/ui/Card";

const ASK_INTEGRITY_URL = "https://connect.integrity.com/agent/ask-integrity/sales-coach";

/**
 * Integrity's site sends a frame-blocking security header (X-Frame-Options /
 * CSP frame-ancestors), so unlike the Quote Tool's embeds it refuses to
 * render inside an iframe at all — confirmed as a hard "refused to connect"
 * in the browser, not something any client-side fix here can work around.
 * This is a launch card instead: same tab, opens in a new tab.
 */
export function AskIntegrityTool() {
  return (
    <AccentCard className="mb-8 flex flex-col items-center gap-4 py-12 text-center">
      <Bot className="h-10 w-10 text-copper" />
      <div>
        <h2 className="font-condensed text-xl font-extrabold tracking-wide text-white uppercase">Ask Integrity</h2>
        <p className="mt-2 max-w-md text-sm text-muted">
          Integrity&apos;s sales coach doesn&apos;t allow itself to be embedded here — it opens in its own tab instead.
        </p>
      </div>
      <a
        href={ASK_INTEGRITY_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="font-condensed flex items-center gap-2 rounded-lg border-[1.5px] border-copper bg-copper px-6 py-3 text-[13px] font-bold tracking-[0.05em] text-black uppercase transition-colors hover:bg-copper/90"
      >
        <ExternalLink className="h-4 w-4" />
        Open Ask Integrity
      </a>
    </AccentCard>
  );
}
