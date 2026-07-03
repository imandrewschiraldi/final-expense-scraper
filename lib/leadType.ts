export const LEAD_TYPES = ["VETERANS_FINAL_EXPENSE", "MORTGAGE_PROTECTION"] as const;

export type LeadType = (typeof LEAD_TYPES)[number];

export const LEAD_TYPE_LABELS: Record<LeadType, string> = {
  VETERANS_FINAL_EXPENSE: "Veterans Final Expense",
  MORTGAGE_PROTECTION: "Mortgage Protection",
};

export function isLeadType(value: string | null | undefined): value is LeadType {
  return !!value && (LEAD_TYPES as readonly string[]).includes(value);
}
