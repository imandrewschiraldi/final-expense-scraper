export const LEAD_TYPES = ["VETERANS_FINAL_EXPENSE", "MORTGAGE_PROTECTION", "FINAL_EXPENSE", "IUL"] as const;

export type LeadType = (typeof LEAD_TYPES)[number];

export const LEAD_TYPE_LABELS: Record<LeadType, string> = {
  VETERANS_FINAL_EXPENSE: "Veterans Final Expense",
  MORTGAGE_PROTECTION: "Mortgage Protection",
  FINAL_EXPENSE: "Final Expense",
  IUL: "IUL",
};

export function isLeadType(value: string | null | undefined): value is LeadType {
  return !!value && (LEAD_TYPES as readonly string[]).includes(value);
}
