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
  {
    dot: string;
    badgeBg: string;
    badgeText: string;
    border: string;
    bar: string;
  }
> = {
  copper: {
    dot: "bg-copper",
    badgeBg: "bg-copper/20",
    badgeText: "text-copper",
    border: "border-copper",
    bar: "bg-copper",
  },
  teal: {
    dot: "bg-teal",
    badgeBg: "bg-teal/20",
    badgeText: "text-teal-light",
    border: "border-teal",
    bar: "bg-teal",
  },
  gold: {
    dot: "bg-gold",
    badgeBg: "bg-gold/20",
    badgeText: "text-gold",
    border: "border-gold",
    bar: "bg-gold",
  },
  green: {
    dot: "bg-green",
    badgeBg: "bg-green/20",
    badgeText: "text-green-light",
    border: "border-green",
    bar: "bg-green",
  },
  red: {
    dot: "bg-red",
    badgeBg: "bg-red/20",
    badgeText: "text-red-light",
    border: "border-red",
    bar: "bg-red",
  },
  blue: {
    dot: "bg-blue",
    badgeBg: "bg-blue/20",
    badgeText: "text-blue-light",
    border: "border-blue",
    bar: "bg-blue",
  },
  amber: {
    dot: "bg-amber",
    badgeBg: "bg-amber/20",
    badgeText: "text-amber",
    border: "border-amber",
    bar: "bg-amber",
  },
  muted: {
    dot: "bg-muted",
    badgeBg: "bg-muted/20",
    badgeText: "text-muted",
    border: "border-muted",
    bar: "bg-muted",
  },
};
