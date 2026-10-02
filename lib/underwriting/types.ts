// Shared shapes for the underwriting data/engine. See data/underwriting/
// and the original package README for the full field reference — this
// mirrors that exactly, just typed.

export type Sheet = "wl" | "tm";

export type Product = {
  id: string;
  name: string;
  cov?: string;
  age?: string;
  ageMin: number | null;
  ageMax: number | null;
  face?: string;
  build?: string;
  sales?: string;
  quote?: string;
  pay?: string;
  lb?: string;
};

export type Products = { wholeLife: Product[]; termUlIul: Product[] };

// `k` discriminates the rule kind; which other fields are present depends
// on it (see README's Rule table) — kept as one loose shape rather than a
// discriminated union since the JSON data isn't itself discriminated at
// the type level, and every field here is read defensively in evalRule.
export type Rule = {
  k: "ok" | "decline" | "gi" | "time" | "current" | "na" | "ns" | "blank" | "review";
  tier?: string;
  tiers?: { max: number; out: string }[];
  beyond?: string;
  ifCurrent?: string;
  x?: 1;
  t?: string;
};

export type Condition = {
  id: number;
  name: string;
  rules: Record<string, Rule>;
};

export type Medication = Record<string, { wl: number | null; tm: number | null; label: string }>;

export type SelectedCondition = {
  id: number;
  yearsSince: string | number;
  current: boolean;
  via?: string | null;
};

export type Client = { age: string | number; tobacco?: boolean };

export type RuleOutcome = { s: string; x?: 1; note?: string };

export type VerdictDetail = {
  condition: string;
  outcome: string;
  extraCriteria: boolean;
  ruleText?: string;
};

export type Band = "BEST" | "STANDARD" | "GRADED" | "GI" | "REVIEW" | "INELIG" | "DECLINE";

export type ProductVerdict = {
  band: Band;
  worstSeverity: number;
  details: VerdictDetail[];
};

export type BandedResults = Record<Band, (ProductVerdict & { product: Product })[]>;

export type SearchHit =
  | { type: "condition"; id: number; name: string }
  | { type: "medication"; id: number; name: string; mapsTo: string };
