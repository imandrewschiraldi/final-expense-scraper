export const POLICY_STATUSES = ["SUBMITTED", "ISSUED"] as const;

export type PolicyStatus = (typeof POLICY_STATUSES)[number];

export const POLICY_STATUS_LABELS: Record<PolicyStatus, string> = {
  SUBMITTED: "Submitted",
  ISSUED: "Issued",
};

export function isPolicyStatus(value: string): value is PolicyStatus {
  return POLICY_STATUSES.includes(value as PolicyStatus);
}
