/** The fixed palette admins pick from when adding or recoloring a
 *  PipelineStage — the same named colors already used everywhere else in
 *  the app (StatusBadge, KPI tiles, funnel bars), so a custom stage never
 *  introduces a color outside the existing design system. */
export const PIPELINE_STAGE_COLOR_TOKENS = [
  "copper",
  "teal",
  "gold",
  "green",
  "red",
  "blue",
  "amber",
  "muted",
] as const;

export type PipelineStageColorToken =
  (typeof PIPELINE_STAGE_COLOR_TOKENS)[number];

export function isPipelineStageColorToken(
  value: string,
): value is PipelineStageColorToken {
  return (PIPELINE_STAGE_COLOR_TOKENS as readonly string[]).includes(value);
}

/** Tailwind classes for a small color dot/swatch and a soft badge, keyed by
 *  colorToken. Every token maps to a CSS var already defined in
 *  app/globals.css (--copper, --teal, --gold, ...), so these stay correct
 *  across the light/dark/green theme variants without any extra work. */
export const PIPELINE_STAGE_COLOR_CLASSES: Record<
  PipelineStageColorToken,
  { dot: string; badgeBg: string; badgeText: string }
> = {
  copper: {
    dot: "bg-copper",
    badgeBg: "bg-copper/20",
    badgeText: "text-copper",
  },
  teal: { dot: "bg-teal", badgeBg: "bg-teal/20", badgeText: "text-teal-light" },
  gold: { dot: "bg-gold", badgeBg: "bg-gold/20", badgeText: "text-gold" },
  green: {
    dot: "bg-green",
    badgeBg: "bg-green/20",
    badgeText: "text-green-light",
  },
  red: { dot: "bg-red", badgeBg: "bg-red/20", badgeText: "text-red-light" },
  blue: { dot: "bg-blue", badgeBg: "bg-blue/20", badgeText: "text-blue-light" },
  amber: { dot: "bg-amber", badgeBg: "bg-amber/20", badgeText: "text-amber" },
  muted: { dot: "bg-muted", badgeBg: "bg-muted/20", badgeText: "text-muted" },
};
