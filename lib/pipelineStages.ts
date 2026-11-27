import type { PipelinePhase } from "@prisma/client";

/** Every stage this feature ships with, seeded once by
 *  /api/admin/pipeline/seed-stages. `systemKey` ties a row to the exact
 *  LeadStatus/PolicyStatus value existing business logic (the Vault state
 *  machine, Hall of Fame, the Leaderboard, both dashboards) depends on —
 *  those six rows' labels/colors/order can be changed later, but never
 *  their systemKey, and they can never be deleted (see PipelineStage's own
 *  schema doc comment). Everything else here has no systemKey: it's a
 *  purely organizational stage, exactly like one an admin adds later
 *  through the stage-management screen — seeded up front only because
 *  these specific ones were asked for by name, not because they're
 *  special beyond that. */
export const SEED_STAGES: {
  phase: PipelinePhase;
  name: string;
  order: number;
  colorToken: string;
  systemKey: string | null;
}[] = [
  // Lead phase — shared by My Leads, the Vault, and every "X Leads" board.
  {
    phase: "LEAD",
    name: "New",
    order: 0,
    colorToken: "copper",
    systemKey: "NEW",
  },
  {
    phase: "LEAD",
    name: "Contacted",
    order: 1,
    colorToken: "teal",
    systemKey: "CONTACTED",
  },
  {
    phase: "LEAD",
    name: "No Answer",
    order: 2,
    colorToken: "muted",
    systemKey: "NO_ANSWER",
  },
  {
    phase: "LEAD",
    name: "Callback Later",
    order: 3,
    colorToken: "gold",
    systemKey: null,
  },
  {
    phase: "LEAD",
    name: "Appointment Booked",
    order: 4,
    colorToken: "gold",
    systemKey: "APPOINTMENT_BOOKING",
  },
  {
    phase: "LEAD",
    name: "No Show",
    order: 5,
    colorToken: "red",
    systemKey: null,
  },
  {
    phase: "LEAD",
    name: "Long-Term Follow-Up",
    order: 6,
    colorToken: "blue",
    systemKey: null,
  },
  {
    phase: "LEAD",
    name: "Cancelled",
    order: 7,
    colorToken: "red",
    systemKey: null,
  },
  {
    phase: "LEAD",
    name: "Not Interested",
    order: 8,
    colorToken: "red",
    systemKey: "NOT_INTERESTED",
  },
  {
    phase: "LEAD",
    name: "Sold",
    order: 9,
    colorToken: "green",
    systemKey: "SOLD",
  },

  // Client phase — shared by every "X Client" board.
  {
    phase: "CLIENT",
    name: "Submitted",
    order: 0,
    colorToken: "blue",
    systemKey: "SUBMITTED",
  },
  {
    phase: "CLIENT",
    name: "Issued",
    order: 1,
    colorToken: "green",
    systemKey: "ISSUED",
  },
  {
    phase: "CLIENT",
    name: "Annual Review Ready",
    order: 2,
    colorToken: "gold",
    systemKey: null,
  },
  {
    phase: "CLIENT",
    name: "Lapsed",
    order: 3,
    colorToken: "muted",
    systemKey: null,
  },
  {
    phase: "CLIENT",
    name: "Chargeback",
    order: 4,
    colorToken: "red",
    systemKey: "CHARGEBACK",
  },
];

/** The name a brand-new, never-before-seen stage (from before this feature
 *  existed) should fall back to resolving against — kept here rather than
 *  inlined so the seed route and any future reseed logic agree on it. */
export const ANNUAL_REVIEW_STAGE_NAME = "Annual Review Ready";
export const LAPSED_STAGE_NAME = "Lapsed";
