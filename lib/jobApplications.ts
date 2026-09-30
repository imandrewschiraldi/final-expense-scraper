// Shared config for the Job Applications funnel — the status list, labels,
// and grouping used by both the admin panel (rendering the funnel/table)
// and the API routes (validating a status PATCH).

export const APPLICATION_STATUSES = [
  { id: "NEW", label: "New", color: "#8A8A85" },
  { id: "CONTACTED", label: "Contacted", color: "#D98B4A" },
  { id: "SCHEDULED", label: "Scheduled", color: "#E8A467" },
  { id: "INTERVIEWED", label: "Interviewed", color: "#4A90D9" },
  { id: "HIRED", label: "Hired", color: "#E8853D" },
  { id: "PRE_LICENSING", label: "Pre-Licensing", color: "#8A8A85" },
  { id: "LICENSED", label: "Licensed", color: "#D98B4A" },
  { id: "ONBOARDED", label: "Onboarded", color: "#5CB85C" },
  { id: "REJECTED", label: "Rejected", color: "#C24A4A" },
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
