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
];

export const ARCHIVED_STATUSES: LeadStatus[] = ["SOLD", "NOT_INTERESTED"];

export function isArchivedStatus(status: LeadStatus) {
  return ARCHIVED_STATUSES.includes(status);
}

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  NO_ANSWER: "No Answer",
  APPOINTMENT_BOOKING: "Appointment Booking",
  SOLD: "Sold",
  NOT_INTERESTED: "Not Interested",
};

export const LEAD_STATUS_COLORS: Record<LeadStatus, { bg: string; text: string; border: string }> = {
  NEW: { bg: "bg-copper/10", text: "text-copper-light", border: "border-copper/40" },
  CONTACTED: { bg: "bg-teal/10", text: "text-teal-light", border: "border-teal/40" },
  NO_ANSWER: { bg: "bg-muted/10", text: "text-muted", border: "border-border" },
  APPOINTMENT_BOOKING: { bg: "bg-gold/10", text: "text-gold", border: "border-gold/40" },
  SOLD: { bg: "bg-green/10", text: "text-green-light", border: "border-green/40" },
  NOT_INTERESTED: { bg: "bg-muted/5", text: "text-muted", border: "border-border" },
};
