// Port of the Tier 1 Underwriting Engine (pure logic, no UI) — see the
// original package's README for the full behavior spec. Kept logically
// identical to the source engine; only typed and renamed for this repo.
import { Band, BandedResults, Client, Condition, Medication, Product, Rule, RuleOutcome, SearchHit, SelectedCondition, VerdictDetail } from "./types";

// Severity of each outcome. A higher number is worse, and a product's band
// comes from the worst outcome across all of the client's conditions.
export const SEVERITY: Record<string, number> = {
  APPROVED: 20,
  LEVEL: 20,
  PREFERRED: 20,
  STANDARD: 40,
  GRADED: 60,
  MODIFIED: 60,
  BASIC: 60,
  ROP: 60,
  LEGACY: 60,
  GI: 80,
  DECLINE: 100,
};

export const TIER_LABEL: Record<string, string> = {
  APPROVED: "Approved",
  LEVEL: "Level",
  PREFERRED: "Preferred",
  STANDARD: "Standard",
  GRADED: "Graded",
  MODIFIED: "Modified",
  BASIC: "Basic",
  ROP: "Return of Premium",
  LEGACY: "SimpliNow Legacy",
  GI: "Guaranteed Issue",
  DECLINE: "Declined",
};

// Display order of result bands, best to worst.
export const BANDS: { key: Band; label: string }[] = [
  { key: "BEST", label: "Approved — Best Fit" },
  { key: "STANDARD", label: "Standard" },
  { key: "GRADED", label: "Graded / Modified" },
  { key: "GI", label: "Guaranteed Issue" },
  { key: "REVIEW", label: "Needs Review" },
  { key: "DECLINE", label: "Declined" },
  { key: "INELIG", label: "Outside Age Range" },
];

/** Evaluate one rule (one condition x one product). See Rule's doc comment
 * in types.ts, and the package README's Rule table, for what each `k`
 * means and which extra fields it reads. */
export function evalRule(rule: Rule, sel: SelectedCondition): RuleOutcome {
  switch (rule.k) {
    case "blank":
    case "na":
      return { s: "NA" };
    case "ns":
      return { s: "NS" };
    case "ok":
      return { s: rule.tier!, x: rule.x };
    case "decline":
      return { s: "DECLINE" };
    case "gi":
      return { s: "GI" };
    case "current":
      if (sel.current === false) return { s: "APPROVED", note: "past history — verify" };
      return { s: rule.ifCurrent! };
    case "time": {
      if (sel.yearsSince === "" || sel.yearsSince == null) return { s: "TIME" }; // needs input
      const y = typeof sel.yearsSince === "number" ? sel.yearsSince : parseFloat(sel.yearsSince);
      for (const t of rule.tiers ?? []) if (y <= t.max) return { s: t.out, x: rule.x };
      return { s: rule.beyond!, x: rule.x };
    }
    default:
      return { s: "REVIEW" };
  }
}

// Some products are inherently graded or guaranteed issue, so they can
// never rank as "Best Fit".
function baseSeverity(product: Product): number {
  const n = `${product.name} ${product.cov || ""}`.toLowerCase();
  if (n.includes("guaranteed")) return SEVERITY.GI;
  if ((product.cov || "").toUpperCase().startsWith("GRADED")) return SEVERITY.GRADED;
  return 0;
}

/** Verdict for a single product. */
export function productVerdict(
  product: Product,
  conditionsById: Map<number, Condition>,
  client: Client,
  selected: SelectedCondition[],
): { band: Band; worstSeverity: number; details: VerdictDetail[] } {
  const details: VerdictDetail[] = [];
  let worst = baseSeverity(product);
  let unknown = false;

  for (const sel of selected) {
    const cond = conditionsById.get(sel.id);
    if (!cond) continue;
    const rule = cond.rules[product.id];
    if (!rule) continue;
    const v = evalRule(rule, sel);
    details.push({ condition: cond.name, outcome: v.s, extraCriteria: !!v.x, ruleText: rule.t });
    if (v.s === "NA" || v.s === "NS") continue;
    if (v.s === "TIME" || v.s === "REVIEW") {
      unknown = true;
      continue;
    }
    worst = Math.max(worst, SEVERITY[v.s] || 0);
    if (v.x) unknown = true;
  }

  const age = typeof client.age === "number" ? client.age : parseInt(client.age, 10);
  const outsideAge =
    !isNaN(age) && product.ageMin != null && product.ageMax != null && (age < product.ageMin || age > product.ageMax);

  let band: Band;
  if (outsideAge) band = "INELIG";
  else if (worst >= 100) band = "DECLINE";
  else if (unknown) band = "REVIEW";
  else if (worst >= 80) band = "GI";
  else if (worst >= 60) band = "GRADED";
  else if (worst >= 40) band = "STANDARD";
  else band = "BEST";

  return { band, worstSeverity: worst, details };
}

// Carrier display priority, agency-specified — not alphabetical. Checked as
// lowercase substrings against the product name, in order, so earlier
// entries win when a name could plausibly match more than one (none
// currently do). LGA/Banner Life products count as Ethos (the package
// README groups "Ethos (TruStage, LGA/Banner)" as one carrier), and
// "uhl"/"UHL ..." products count as United Home Life, their underwriting
// brand. A carrier with no match (currently just F&G, the one carrier the
// agency didn't rank) sorts after every named one.
const CARRIER_ORDER: ((name: string) => boolean)[] = [
  (n) => n.includes("americo"),
  (n) => n.includes("transamerica"),
  (n) => n.includes("ethos") || n.includes("trustage") || n.includes("lga") || n.includes("banner"),
  (n) => n.includes("american amicable"),
  (n) => n.includes("aig"),
  (n) => n.includes("mutual of omaha"),
  (n) => n.includes("royal neighbors"),
  (n) => n.includes("united home life") || n.includes("uhl"),
  (n) => n.includes("foresters"),
];

function carrierRank(product: Product): number {
  const name = product.name.toLowerCase();
  const idx = CARRIER_ORDER.findIndex((test) => test(name));
  return idx === -1 ? CARRIER_ORDER.length : idx;
}

/**
 * Run the full underwriting pass and return products grouped by band.
 * Ordering within each band is client-first:
 *   1. strongest underwriting outcome (lowest severity)
 *   2. fewest open questions (missing "years since", review rules, extra criteria)
 *   3. agency-specified carrier priority (CARRIER_ORDER above)
 *   4. alphabetical, as a final tiebreaker within the same carrier
 */
export function runUnderwriting({
  products,
  conditions,
  client,
  selected,
}: {
  products: Product[];
  conditions: Condition[];
  client: Client;
  selected: SelectedCondition[];
}): BandedResults {
  const byId = new Map(conditions.map((c) => [c.id, c]));
  const out = BANDS.reduce((acc, b) => {
    acc[b.key] = [];
    return acc;
  }, {} as BandedResults);
  for (const p of products) {
    const v = productVerdict(p, byId, client, selected);
    out[v.band].push({ product: p, ...v });
  }
  const openQs = (r: { details: VerdictDetail[] }) =>
    r.details.filter((d) => d.outcome === "TIME" || d.outcome === "REVIEW" || d.extraCriteria).length;
  for (const k of Object.keys(out) as Band[]) {
    out[k].sort(
      (a, b) =>
        a.worstSeverity - b.worstSeverity ||
        openQs(a) - openQs(b) ||
        carrierRank(a.product) - carrierRank(b.product) ||
        a.product.name.localeCompare(b.product.name),
    );
  }
  return out;
}

/** Search conditions and medications. */
export function search(query: string, conditions: Condition[], medications: Medication, sheet: "wl" | "tm"): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const hits: SearchHit[] = conditions
    .filter((c) => c.name.toLowerCase().includes(q))
    .map((c) => ({ type: "condition" as const, id: c.id, name: c.name }));
  for (const [med, m] of Object.entries(medications)) {
    const target = m[sheet];
    if (target != null && med.includes(q)) hits.push({ type: "medication", id: target, name: med, mapsTo: m.label });
  }
  return hits.slice(0, 15);
}

/** BMI helper. */
export const bmi = (feet: number, inches: number, lbs: number): number | null => {
  const h = feet * 12 + inches;
  return h > 0 && lbs > 0 ? +((lbs / (h * h)) * 703).toFixed(1) : null;
};
