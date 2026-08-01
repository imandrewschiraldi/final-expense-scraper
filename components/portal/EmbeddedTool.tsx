import { ExternalLink } from "lucide-react";

/** Renders a third-party tool directly on the page via iframe — no card/
 * border, no page title, and the frame stretches past the page's own
 * padding on every side so the tool itself is the very first thing on the
 * page (on desktop — below lg, PageHeader's mobile top bar comes first, so
 * the iframe only needs to reach the left/right/bottom edges there, sized to
 * the remaining height). The iframe requests the tool's own "embed" mode
 * (?embed=1), which hides just its Tier 1 logo and copper line (its other
 * header controls, like Scripts' New Call button, stay visible) so our own
 * logo — the sidebar's on desktop, PageHeader's on mobile — is the only one
 * on screen. "Open in New Tab" links to the plain URL instead, so a
 * standalone visit still shows the tool's full branded header. The link
 * sits top-left, where the now-hidden logo used to be, since the tool's own
 * header controls occupy the top-right. */
export function EmbeddedTool({ title, src }: { title: string; src: string }) {
  const embedSrc = `${src}${src.includes("?") ? "&" : "?"}embed=1`;

  return (
    <div className="relative -mx-4 -mb-8 h-[calc(100dvh-74px)] sm:-mx-6 lg:-mx-10 lg:-mt-2 lg:h-screen">
      <iframe src={embedSrc} title={title} className="h-full w-full border-0" />
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-3 left-3 flex items-center gap-1.5 rounded-md bg-black/60 px-2.5 py-1.5 text-xs font-semibold text-muted backdrop-blur-sm transition-colors hover:text-white"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        Open in New Tab
      </a>
    </div>
  );
}
