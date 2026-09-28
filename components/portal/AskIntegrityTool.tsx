import Image from "next/image";
import { Laptop } from "lucide-react";

const ASK_INTEGRITY_URL = "https://connect.integrity.com/agent/ask-integrity/sales-coach";

/**
 * Integrity's site sends a frame-blocking security header (X-Frame-Options /
 * CSP frame-ancestors), so unlike the Quote Tool's embeds it refuses to
 * render inside an iframe at all — confirmed as a hard "refused to connect"
 * in the browser, not something any client-side fix here can work around.
 * This instead replicates the tile Integrity's own "Ask Integrity" page
 * shows for its Sales Coach — the whole tile is the link, opening the real
 * tool in a new tab.
 */
export function AskIntegrityTool() {
  return (
    <div className="mb-8 flex flex-col items-center gap-6 py-8">
      <Image src="/ask-integrity-icon.png" alt="" width={251} height={251} className="h-14 w-14" />

      <a
        href={ASK_INTEGRITY_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full max-w-xs items-start gap-3 rounded-lg border border-black/10 bg-white p-4 text-left shadow-md transition-transform hover:-translate-y-0.5 hover:shadow-lg"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#e8edf7]">
          <Laptop className="h-5 w-5 text-[#1a2f5c]" />
        </div>
        <div>
          <p className="text-sm font-bold text-[#1a2f5c]">Sales Coach</p>
          <p className="mt-1 text-xs text-gray-500">
            Practice sales objections and scenarios using Ask Integrity® personas.
          </p>
        </div>
      </a>
    </div>
  );
}
