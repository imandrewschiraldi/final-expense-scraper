"use client";

import { useCardLayout } from "@/lib/cardLayoutContext";
import { cn } from "@/lib/cn";

/** Renders a third-party tool directly on the page via iframe — no card/
 * border, no page title, and the frame stretches past the page's own
 * padding on every side so the tool itself is the very first thing on the
 * page (on desktop — below lg, PageHeader's mobile top bar comes first, so
 * the iframe only needs to reach the left/right/bottom edges there, sized to
 * the remaining height). The iframe requests the tool's own "embed" mode
 * (?embed=1), which hides just its Tier 1 logo and copper line (its other
 * header controls, like Scripts' New Call button, stay visible) so our own
 * logo — the sidebar's on desktop, PageHeader's on mobile — is the only one
 * on screen.
 *
 * "Open in New Tab" and the rest of the page's header controls are
 * deliberately NOT drawn out here as an outer overlay (see TopBarActions,
 * which renders nothing at all on these two routes) — an overlay sitting
 * outside the iframe can't scroll away with the tool's own content the way
 * everything inside the iframe does. "Open in New Tab" instead lives inside
 * each tool's own header (the 4 self-hosted HTML files under public/tools/),
 * shown only in embed mode, so it scrolls away in sync with that header.
 *
 * `lightSrc`/`greenSrc` — optional self-hosted light-mode/green-mode builds
 * of the same tool (e.g. /tools/sales-script-light.html,
 * /tools/sales-script-green.html), shown instead of `src` whenever the
 * portal itself is in that theme. `src` itself is a self-hosted dark-mode
 * build with no theme awareness of its own (e.g. /tools/sales-script-dark.html),
 * so without lightSrc/greenSrc a light- or green-mode visitor would hit a
 * jarring dark iframe inside an otherwise themed page.
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
 * rules in globals.css, keyed off the `data-theme` attribute on <html>.
 *
 * `useCardLayout()` reports whether AppShell is currently wrapping this
 * route in the overlay-card beta's rounded frame (true only for
 * Scripts/Commission Calculator, and only once that beta is on). The
 * card's own content area has no padding of its own on these routes (see
 * AppShell), so there's nothing for the usual negative margins below to
 * cancel — bleeding past it with the same offsets would overshoot past the
 * card's rounded edges instead of filling them. In that mode the wrapper
 * just fills the card's interior at h-full/w-full; the card's own
 * `overflow-y-auto` + `rounded-[20px]` combination clips the iframe's
 * square corners to match automatically. */
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
  const inCard = useCardLayout();

  function embed(url: string) {
    return `${url}${url.includes("?") ? "&" : "?"}embed=1`;
  }

  return (
    <div
      data-tour="embedded-tool"
      className={cn(
        "relative",
        inCard
          ? "h-full w-full"
          : "-mx-4 -mb-8 h-[calc(100dvh-74px)] sm:-mx-6 lg:-mx-10 lg:-mt-2 lg:h-screen",
      )}
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
    </div>
  );
}
