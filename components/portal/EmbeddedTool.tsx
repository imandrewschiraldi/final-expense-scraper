import { ExternalLink } from "lucide-react";

/** Renders a third-party tool directly on the page via iframe — no card/
 * border, no page title, and the frame stretches past the page's own
 * padding on every side so the tool itself is the very first thing on the
 * page. A small floating link over the top-right corner is the only
 * fallback for sites that block being framed. */
export function EmbeddedTool({ title, src }: { title: string; src: string }) {
  return (
    <div className="relative -mx-6 -my-8 h-screen lg:-mx-10">
      <iframe src={src} title={title} className="h-full w-full border-0" />
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-3 right-3 flex items-center gap-1.5 rounded-md bg-black/60 px-2.5 py-1.5 text-xs font-semibold text-muted backdrop-blur-sm transition-colors hover:text-white"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        Open in New Tab
      </a>
    </div>
  );
}
