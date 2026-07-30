import { ExternalLink } from "lucide-react";

/** Renders a third-party tool inside the platform via iframe, with a
 * fallback link since some external sites block being framed. */
export function EmbeddedTool({ title, description, src }: { title: string; description: string; src: string }) {
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold text-white">{title}</h1>
          <p className="text-sm text-muted">{description}</p>
        </div>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="font-condensed inline-flex items-center gap-2 rounded-lg border-[1.5px] border-copper-dim px-4 py-2 text-[13px] font-bold tracking-[0.05em] text-muted uppercase transition-colors hover:border-copper hover:text-foreground"
        >
          <ExternalLink className="h-4 w-4" />
          Open in New Tab
        </a>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-surface">
        <iframe src={src} title={title} className="h-full w-full" />
      </div>
    </div>
  );
}
