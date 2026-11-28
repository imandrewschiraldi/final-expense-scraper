export const LEAD_TYPES = [
  "VETERANS_FINAL_EXPENSE",
  "MORTGAGE_PROTECTION",
  "FINAL_EXPENSE",
  "IUL",
  "ANNUITY",
  "WHOLE_LIFE",
  "TERM_LIFE",
] as const;

export type LeadType = (typeof LEAD_TYPES)[number];

export const LEAD_TYPE_LABELS: Record<LeadType, string> = {
  VETERANS_FINAL_EXPENSE: "Veterans Final Expense",
  MORTGAGE_PROTECTION: "Mortgage Protection",
  FINAL_EXPENSE: "Final Expense",
  IUL: "IUL",
  ANNUITY: "Annuity",
  WHOLE_LIFE: "Whole Life",
  TERM_LIFE: "Term Life",
};

export function isLeadType(value: string | null | undefined): value is LeadType {
  return !!value && (LEAD_TYPES as readonly string[]).includes(value);
}

// The richer tobacco-use breakdown carriers actually underwrite on — see
// Lead.tobaccoStatus's own schema doc comment for why this exists
// alongside the plain tobaccoUse boolean.
export const TOBACCO_STATUSES = ["YES", "NO", "QUIT_12_MONTHS_PLUS"] as const;
export type TobaccoStatus = (typeof TOBACCO_STATUSES)[number];
export const TOBACCO_STATUS_LABELS: Record<TobaccoStatus, string> = {
  YES: "Yes",
  NO: "No",
  QUIT_12_MONTHS_PLUS: "Quit 12+ months ago",
};

// Client Health checklist — matches the agency's real paper Client
// Suitability Sheet's "circle all that apply" list exactly, so the digital
// version captures the same conditions the paper one does. See
// Lead.healthConditions's own schema doc comment.
export const HEALTH_CONDITIONS = [
  "Heart Attack",
  "Stroke",
  "TIA",
  "Cancer",
  "Stents",
  "Diabetes",
  "High Blood Pressure",
  "Neuropathy",
  "Lupus / Rheumatoid Arthritis",
  "Asthma & COPD",
  "Thyroid",
  "Anxiety / Depression",
  "Kidney or Liver Disease",
  "STD",
] as const;

// Liquid assets for an emergency checklist — see Lead.liquidAssets.
export const LIQUID_ASSETS = [
  "401k",
  "IRA",
  "Stocks",
  "Bonds",
  "Mutual Funds",
  "CDs",
  "Rentals",
  "Significant Savings",
] as const;

export const MORTGAGE_PURCHASE_TYPES = ["REFINANCED", "ORIGINAL_PURCHASE", "HOUSE"] as const;
export const MORTGAGE_PURCHASE_TYPE_LABELS: Record<(typeof MORTGAGE_PURCHASE_TYPES)[number], string> = {
  REFINANCED: "Refinanced",
  ORIGINAL_PURCHASE: "Original Purchase",
  HOUSE: "House",
};

export const LIFE_INSURANCE_SOURCES = ["PRIVATE", "WORK"] as const;
export const LIFE_INSURANCE_SOURCE_LABELS: Record<(typeof LIFE_INSURANCE_SOURCES)[number], string> = {
  PRIVATE: "Private",
  WORK: "Work",
};

export const LIFE_INSURANCE_TYPES = ["TERM", "WHOLE_LIFE"] as const;
export const LIFE_INSURANCE_TYPE_LABELS: Record<(typeof LIFE_INSURANCE_TYPES)[number], string> = {
  TERM: "Term",
  WHOLE_LIFE: "Whole Life",
};
