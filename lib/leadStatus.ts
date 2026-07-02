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
  NEW: { bg: "bg-copper/20", text: "text-copper", border: "border-transparent" },
  CONTACTED: { bg: "bg-teal/20", text: "text-teal-light", border: "border-transparent" },
  NO_ANSWER: { bg: "bg-muted/20", text: "text-muted", border: "border-transparent" },
  APPOINTMENT_BOOKING: { bg: "bg-gold/20", text: "text-gold", border: "border-transparent" },
  SOLD: { bg: "bg-green/20", text: "text-green-light", border: "border-transparent" },
  NOT_INTERESTED: { bg: "bg-red/20", text: "text-red-light", border: "border-transparent" },
};
