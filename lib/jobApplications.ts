// Shared config for the Job Applications funnel — the status list, labels,
// and grouping used by both the admin panel (rendering the funnel/table)
// and the API routes (validating a status PATCH).

// Colors below are the approved metallic palette's flat base tones — the
// exact same hexes the metallic treatment (lib/metallic.ts) builds its
// gradients from. Copper/Green/Red are pixel-identical to the button
// colors on purpose (Contacted/Hired/Licensed = primary, Onboarded = success,
// Rejected = danger) so a funnel bar and the button for the same action
// always match. Gray/Blue/Amber have no button equivalent, tuned to the
// same depth instead.
export const APPLICATION_STATUSES = [
  { id: "NEW", label: "New", color: "#7f7f7a" },
  { id: "CONTACTED", label: "Contacted", color: "#a85a28" },
  { id: "SCHEDULED", label: "Scheduled", color: "#a7764a" },
  { id: "INTERVIEWED", label: "Interviewed", color: "#3a70a9" },
  { id: "HIRED", label: "Hired", color: "#a85a28" },
  { id: "PRE_LICENSING", label: "Pre-Licensing", color: "#7f7f7a" },
  { id: "LICENSED", label: "Licensed", color: "#a85a28" },
  { id: "ONBOARDED", label: "Onboarded", color: "#27ae60" },
  { id: "REJECTED", label: "Rejected", color: "#c0392b" },
] as const;

export type ApplicationStatusId = (typeof APPLICATION_STATUSES)[number]["id"];

/** The main interview pipeline, shown as the primary funnel. */
export const MAIN_FUNNEL_STATUSES: ApplicationStatusId[] = ["NEW", "CONTACTED", "SCHEDULED", "INTERVIEWED", "HIRED"];

/** Post-hire onboarding stages, shown as a secondary funnel once someone reaches HIRED. */
export const ONBOARDING_FUNNEL_STATUSES: ApplicationStatusId[] = ["PRE_LICENSING", "LICENSED", "ONBOARDED"];

/**
 * Moving into onboarding doesn't mean someone is no longer hired — they're
 * further along, not a different outcome. Anything counting "how many have
 * we hired" (the Hired dashboard card, the main funnel's Hired bar, hire
 * rate) should include these stages too, not just the literal HIRED status.
 */
export const HIRED_OR_LATER_STATUSES: ApplicationStatusId[] = ["HIRED", ...ONBOARDING_FUNNEL_STATUSES];

export function statusLabel(id: string): string {
  return APPLICATION_STATUSES.find((s) => s.id === id)?.label ?? id;
}
