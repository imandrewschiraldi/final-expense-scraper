"use client";

import { ExternalLink } from "lucide-react";
import { useTheme } from "@/lib/useTheme";

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
 * header controls occupy the top-right.
 *
 * `lightSrc`/`greenSrc` — optional self-hosted light-mode/green-mode builds
 * of the same tool (e.g. /tools/sales-script-light.html,
 * /tools/sales-script-green.html), shown instead of `src` whenever the
 * portal itself is in that theme. The tools are otherwise dark-only (hosted
 * externally, no theme awareness of their own), so without these a light-
 * or green-mode visitor would hit a jarring dark iframe inside an otherwise
 * themed page.
 *
 * All three iframes mount at once and stay mounted — only CSS toggles
 * which one shows — rather than flipping a single iframe's `src` between
 * them. Changing an iframe's `src` throws away and fully reloads whatever
 * was in it (every script re-parses, any in-progress calculator inputs are
 * lost), which is what made the theme toggle feel laggy specifically on
 * these two pages: every flip reloaded the whole embedded tool from
 * scratch. This way each one loads once, in parallel, right when the page
 * mounts, and toggling is an instant visibility swap from then on.
 *
 * Which one shows is driven by the `.tool-iframe-{dark,light,green}`
 * rules in globals.css, keyed off the `data-theme` attribute on <html> —
 * NOT by a className computed from `theme` here. That attribute is set by
 * the no-flash inline script in layout.tsx before React ever hydrates;
 * `theme` from useTheme() only updates once its effect runs afterward.
 * Using React state to pick which iframe is hidden left a visible window
 * on every hard reload where the un-hidden default (dark, the slower-to-
 * load externally-hosted tool, with its own black background painting as
 * soon as its document starts streaming) sat fully visible until
 * hydration caught up — a real flash-to-black, not just a cosmetic one.
 * Plain CSS has no such gap: it applies in the same pass as the attribute
 * that's already correct pre-paint. `theme` is still read below, just for
 * the "Open in New Tab" link's href, which doesn't need to be flash-safe. */
export function EmbeddedTool({
  title,
  src,
  lightSrc,
  greenSrc,
}: {
  title: string;
  src: string;
  lightSrc?: string;
  greenSrc?: string;
}) {
  const [theme] = useTheme();
  const showLight = theme === "light" && !!lightSrc;
  const showGreen = !showLight && theme === "green" && !!greenSrc;
  const activeSrc = showLight ? lightSrc! : showGreen ? greenSrc! : src;

  function embed(url: string) {
    return `${url}${url.includes("?") ? "&" : "?"}embed=1`;
  }

  return (
    <div
      data-tour="embedded-tool"
      className="relative -mx-4 -mb-8 h-[calc(100dvh-74px)] sm:-mx-6 lg:-mx-10 lg:-mt-2 lg:h-screen"
    >
      <iframe
        src={embed(src)}
        title={title}
        className="tool-iframe-dark h-full w-full border-0"
      />
      {lightSrc && (
        <iframe
          src={embed(lightSrc)}
          title={title}
          className="tool-iframe-light h-full w-full border-0"
        />
      )}
      {greenSrc && (
        <iframe
          src={embed(greenSrc)}
          title={title}
          className="tool-iframe-green h-full w-full border-0"
        />
      )}
      <a
        href={activeSrc}
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
