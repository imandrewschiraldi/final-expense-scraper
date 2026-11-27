// Scripts and Commission Calculator render a full-bleed iframe that's meant
// to reach the actual edges of the browser window — shared by
// ContentContainer (which skips its own wrapping entirely on these routes)
// and AppShell (which skips the overlay-card beta's extra padding/border on
// these routes too, since a second padded layer around the iframe would
// leave a gutter EmbeddedTool's negative margins were never sized to cancel).
export const FULL_BLEED_PREFIXES = ["/scripts", "/commission-calculator"];

export function isFullBleedRoute(pathname: string): boolean {
  return FULL_BLEED_PREFIXES.some((p) => pathname.startsWith(p));
}
