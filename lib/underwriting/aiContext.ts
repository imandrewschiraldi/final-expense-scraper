// Grounds the header AI search box in the agency's actual underwriting
// guide instead of Gemini's general knowledge — same data/engine the real
// Underwriting Genie tool uses (see UnderwritingGenie.tsx for the
// client-side equivalent of this import pattern), just read server-side and
// summarized into plain text for the prompt rather than rendered as UI.
import productsData from "@/data/underwriting/products.json";
import wlConditionsData from "@/data/underwriting/conditions-whole-life.json";
import tmConditionsData from "@/data/underwriting/conditions-term-ul-iul.json";
import medicationsData from "@/data/underwriting/medications.json";
import { Condition, Medication, Product } from "@/lib/underwriting/types";
import { carrierRank } from "@/lib/underwriting/engine";

const PRODUCTS = productsData as { wholeLife: Product[]; termUlIul: Product[] };
const WL_CONDITIONS = wlConditionsData as Condition[];
const TM_CONDITIONS = tmConditionsData as Condition[];
const MEDICATIONS = medicationsData as Medication;

// Same agency-specified carrier priority the Underwriting Genie's own cards
// sort by (Americo, Transamerica, Ethos, Mutual of Omaha first) — sorted
// once up front so every condition's guide excerpt below already lists
// carriers in that order, rather than raw products.json order, since
// Gemini tends to follow the order information is given to it in.
const WL_PRODUCTS_ORDERED = [...PRODUCTS.wholeLife].sort((a, b) => carrierRank(a) - carrierRank(b));
const TM_PRODUCTS_ORDERED = [...PRODUCTS.termUlIul].sort((a, b) => carrierRank(a) - carrierRank(b));

const STOPWORDS = new Set([
  "the", "and", "for", "with", "that", "this", "does", "what", "who", "how",
  "can", "will", "would", "could", "about", "have", "has", "had", "from",
  "they", "them", "their", "are", "was", "were", "been", "being", "which",
  "when", "where", "into", "over", "under", "cover", "covers", "covered",
  "someone", "person", "client", "insurance", "carrier", "carriers", "policy",
]);

// Readable summary of one rule's outcome — mirrors evalRule's branches in
// engine.ts, but as prose for a prompt instead of a typed RuleOutcome, and
// skips outcomes (n/a, not-sold, blank) that have nothing for an answer to
// say.
function describeRule(rule: Condition["rules"][string]): string | null {
  switch (rule.k) {
    case "ok":
      return `${rule.tier ?? "Approved"}${rule.x ? " (extra criteria apply)" : ""}`;
    case "decline":
      return "Decline";
    case "gi":
      return "Guaranteed Issue only";
    case "current":
      return `${rule.ifCurrent ?? "Decline"} if currently being treated; otherwise case-by-case`;
    case "time": {
      const tiers = (rule.tiers ?? []).map((t) => `${t.out} if ≤${t.max}yr`).join(", ");
      return [tiers, rule.beyond ? `${rule.beyond} beyond that` : null].filter(Boolean).join(", ") || null;
    }
    case "review":
      return rule.t ? `Needs review — ${rule.t}` : "Needs review";
    default:
      return null;
  }
}

function summarizeCondition(cond: Condition, products: Product[], sheetLabel: string): string {
  const lines = products
    .map((p) => {
      const rule = cond.rules[p.id];
      if (!rule) return null;
      const desc = describeRule(rule);
      return desc ? `  - ${p.name}: ${desc}` : null;
    })
    .filter((l): l is string => l !== null);
  if (lines.length === 0) return "";
  return `${sheetLabel} guide — "${cond.name}":\n${lines.join("\n")}`;
}

function scoreMatches(words: string[], conditions: Condition[]): Condition[] {
  const scored = conditions
    .map((c) => {
      const name = c.name.toLowerCase();
      const score = words.filter((w) => name.includes(w)).length;
      return { c, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, 5).map((x) => x.c);
}

/**
 * Pulls the handful of underwriting-guide conditions most relevant to a
 * free-text question and formats them as grounding context for Gemini.
 * Returns "" when nothing in the guide looks relevant — callers should just
 * skip adding context in that case rather than send an empty block.
 */
export function buildUnderwritingContext(question: string): string {
  const words = Array.from(
    new Set(
      question
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !STOPWORDS.has(w)),
    ),
  );
  if (words.length === 0) return "";

  // Medication names mentioned in the question resolve to a condition id in
  // each sheet (see Medication's shape in types.ts) — treat a drug name hit
  // the same as a direct condition-name hit once resolved.
  const medConditionIds = { wl: new Set<number>(), tm: new Set<number>() };
  for (const [med, mapping] of Object.entries(MEDICATIONS)) {
    if (!words.some((w) => med.includes(w) || w.includes(med))) continue;
    if (mapping.wl != null) medConditionIds.wl.add(mapping.wl);
    if (mapping.tm != null) medConditionIds.tm.add(mapping.tm);
  }

  // Medication hits first — a drug name typed verbatim is a stronger signal
  // than generic keyword overlap, so it needs to survive the slice below
  // even when a keyword match happens to tie or score higher.
  const wlMatches = new Map<number, Condition>();
  for (const c of WL_CONDITIONS) if (medConditionIds.wl.has(c.id)) wlMatches.set(c.id, c);
  for (const c of scoreMatches(words, WL_CONDITIONS)) wlMatches.set(c.id, c);

  const tmMatches = new Map<number, Condition>();
  for (const c of TM_CONDITIONS) if (medConditionIds.tm.has(c.id)) tmMatches.set(c.id, c);
  for (const c of scoreMatches(words, TM_CONDITIONS)) tmMatches.set(c.id, c);

  const blocks = [
    ...Array.from(wlMatches.values())
      .slice(0, 5)
      .map((c) => summarizeCondition(c, WL_PRODUCTS_ORDERED, "Whole Life / FEX")),
    ...Array.from(tmMatches.values())
      .slice(0, 5)
      .map((c) => summarizeCondition(c, TM_PRODUCTS_ORDERED, "Term / UL / IUL")),
  ].filter(Boolean);

  if (blocks.length === 0) return "";

  return (
    "Relevant excerpts from the agency's own underwriting guide (use these over general knowledge when they apply; " +
    "each line is one carrier/product's actual outcome for that condition):\n\n" +
    blocks.join("\n\n")
  );
}
