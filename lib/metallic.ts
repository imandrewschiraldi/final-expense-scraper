// JS-side twin of the metallic gradient stops in app/globals.css (the
// --*-metal-hi/-metal-dk custom properties) — needed here because a few
// components (FunnelBars, StatusAnalytics) take an arbitrary hex color as
// a prop and build their fill with inline styles, where a plain CSS class
// can't reach. Keep both tables in sync if either changes.
const METAL_STOPS: Record<string, { hi: string; dk: string }> = {
  "#7f7f7a": { hi: "#b0b0ad", dk: "#464643" }, // gray — New / Pre-Licensing / Submitted
  "#a85a28": { hi: "#d9a478", dk: "#3d1600" }, // copper — Contacted / Hired / Licensed / primary button
  "#a7764a": { hi: "#c8aa8f", dk: "#5c4129" }, // amber — Scheduled
  "#3a70a9": { hi: "#85a6ca", dk: "#203e5d" }, // blue — Interviewed
  "#27ae60": { hi: "#79cd9c", dk: "#156035" }, // green — Onboarded / Issued / success button
  "#c0392b": { hi: "#d8847c", dk: "#6a1f18" }, // red — Rejected / Chargeback / danger button
};

/**
 * A metallic sheen for an arbitrary status/brand hex — dark -> highlight ->
 * base -> highlight -> dark. Falls back to the flat color unchanged for any
 * hex outside the known palette above, so an unrecognized color never
 * breaks (just renders flat instead of metallic).
 */
export function metallicGradient(base: string, angle = 90): string {
  const stops = METAL_STOPS[base.toLowerCase()];
  if (!stops) return base;
  return `linear-gradient(${angle}deg, ${stops.dk} 0%, ${stops.hi} 25%, ${base} 50%, ${stops.hi} 75%, ${stops.dk} 100%)`;
}
