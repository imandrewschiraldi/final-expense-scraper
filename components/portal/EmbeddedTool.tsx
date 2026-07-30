import { ExternalLink } from "lucide-react";

/** Renders a third-party tool directly on the page via iframe — no card/
 * border around it, and the frame stretches past the page's own side/bottom
 * padding so it reads as part of the page rather than a boxed panel sitting
 * on top of it. A small floating link over the top-right corner is the only
 * fallback for sites that block being framed. */
export function EmbeddedTool({ title, description, src }: { title: string; description: string; src: string }) {
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="mb-3">
        <h1 className="text-[26px] font-bold text-white">{title}</h1>
        <p className="text-sm text-muted">{description}</p>
      </div>
      <div className="relative -mx-6 -mb-8 min-h-0 flex-1 lg:-mx-10">
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
    </div>
  );
}
