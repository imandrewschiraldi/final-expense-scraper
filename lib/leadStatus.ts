export const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "NO_ANSWER",
  "APPOINTMENT_BOOKING",
  "SOLD",
  "NOT_INTERESTED",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const ACTIVE_STATUSES: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "NO_ANSWER",
  "APPOINTMENT_BOOKING",
  "NOT_INTERESTED",
];

// Not Interested no longer removes a lead from work — it stays visible
// (tagged) in the vault or in an agent's own book. Only Sold is a true
// dead-end.
export const ARCHIVED_STATUSES: LeadStatus[] = ["SOLD"];

export function isArchivedStatus(status: LeadStatus) {
  return ARCHIVED_STATUSES.includes(status);
}

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  NO_ANSWER: "No Answer",
  APPOINTMENT_BOOKING: "Appointment Booked",
  SOLD: "Sold",
  NOT_INTERESTED: "Not Interested",
};

// NEW/SOLD/NOT_INTERESTED use the approved metallic copper/green/red
// surfaces (same palette as buttons/KPI tiles/funnel bars — see
// app/globals.css's .metal-*-surface classes). CONTACTED/NO_ANSWER/
// APPOINTMENT_BOOKING (teal/muted/gold) stay flat — those colors were
// never part of the metallic pass.
export const LEAD_STATUS_COLORS: Record<LeadStatus, { bg: string; text: string; border: string }> = {
  NEW: { bg: "metal-copper-surface", text: "text-white", border: "border-transparent" },
  CONTACTED: { bg: "bg-teal/20", text: "text-teal-light", border: "border-transparent" },
  NO_ANSWER: { bg: "bg-muted/20", text: "text-muted", border: "border-transparent" },
  APPOINTMENT_BOOKING: { bg: "bg-gold/20", text: "text-gold", border: "border-transparent" },
  SOLD: { bg: "metal-green-surface", text: "text-black", border: "border-transparent" },
  NOT_INTERESTED: { bg: "metal-red-surface", text: "text-white", border: "border-transparent" },
};
