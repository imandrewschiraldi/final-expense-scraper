// The agency's standard tag vocabulary — behaviors/statuses/triggers an
// agent applies to a contact, prefixed by category so the tag list stays
// readable as it grows (lead- / vendor- / appt- / policy- / etc.). These are
// suggestions, not an enforced taxonomy: Lead.tags stays a free-form string
// array (see its own doc comment in schema.prisma) and an agent can still
// type any custom tag — this list just gives them a consistent starting
// point instead of everyone inventing their own spelling of "no show".
//
// Colors are chosen by what the tag means, not by category alone, since a
// lifecycle category like Underwriting & Policy mixes positive and negative
// outcomes: green for a good outcome, amber for in-progress/needs action,
// red for a negative/at-risk outcome, copper/violet for neutral origin
// labels, muted gray for a hard-stop/compliance flag (DNC, wrong number).
const GREEN = "#6B9C4F";
const AMBER = "#D9A441";
const RED = "#B9324A";
const TEAL = "#4F9C8C";
const COPPER = "#C97A3D";
const VIOLET = "#7A6BC9";
const MUTED = "#8a8a8a";

export type SuggestedTag = { key: string; category: string; color: string };

export const SUGGESTED_TAG_CATEGORIES = [
  "Lead Origin & Product",
  "Sales & Appointment Activity",
  "Underwriting & Policy Lifecycle",
  "Retention & Risk",
] as const;

export const SUGGESTED_TAGS: SuggestedTag[] = [
  // Lead Origin & Product
  { key: "lead-final-expense", category: "Lead Origin & Product", color: COPPER },
  { key: "lead-mortgage", category: "Lead Origin & Product", color: COPPER },
  { key: "lead-iul", category: "Lead Origin & Product", color: COPPER },
  { key: "lead-term", category: "Lead Origin & Product", color: COPPER },
  { key: "vendor-fb-ads", category: "Lead Origin & Product", color: VIOLET },
  { key: "vendor-direct-mail", category: "Lead Origin & Product", color: VIOLET },
  { key: "vendor-aged", category: "Lead Origin & Product", color: VIOLET },

  // Sales & Appointment Activity
  { key: "appt-booked", category: "Sales & Appointment Activity", color: TEAL },
  { key: "appt-no-show", category: "Sales & Appointment Activity", color: RED },
  { key: "appt-rescheduled", category: "Sales & Appointment Activity", color: AMBER },
  { key: "appt-sat", category: "Sales & Appointment Activity", color: GREEN },
  { key: "quoted-sent", category: "Sales & Appointment Activity", color: TEAL },
  { key: "follow-up-needed", category: "Sales & Appointment Activity", color: AMBER },

  // Underwriting & Policy Lifecycle
  { key: "app-submitted", category: "Underwriting & Policy Lifecycle", color: TEAL },
  { key: "underwriting-pending", category: "Underwriting & Policy Lifecycle", color: AMBER },
  { key: "requirements-needed", category: "Underwriting & Policy Lifecycle", color: AMBER },
  { key: "policy-approved", category: "Underwriting & Policy Lifecycle", color: GREEN },
  { key: "policy-issued", category: "Underwriting & Policy Lifecycle", color: GREEN },
  { key: "policy-declined", category: "Underwriting & Policy Lifecycle", color: RED },
  { key: "policy-placed", category: "Underwriting & Policy Lifecycle", color: GREEN },

  // Retention & Risk
  { key: "chargeback-risk", category: "Retention & Risk", color: RED },
  { key: "lapsed-payment", category: "Retention & Risk", color: RED },
  { key: "client-active", category: "Retention & Risk", color: GREEN },
  { key: "policy-cancelled", category: "Retention & Risk", color: RED },
  { key: "dnd", category: "Retention & Risk", color: MUTED },
  { key: "do-not-call", category: "Retention & Risk", color: MUTED },
  { key: "wrong-number", category: "Retention & Risk", color: MUTED },
];
