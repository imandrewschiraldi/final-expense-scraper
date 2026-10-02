"use client";

import { Band, BandedResults, Product, ProductVerdict, VerdictDetail } from "@/lib/underwriting/types";
import { BANDS, SEVERITY, TIER_LABEL } from "@/lib/underwriting/engine";
import { cn } from "@/lib/cn";

// Static (never dynamically constructed) so Tailwind's content scanner
// picks every class up at build time. `border`/`text` are for the section
// header and the card's thin left-border accent (both stay flat — a CSS
// border can't cleanly carry a gradient without fighting border-radius).
// `badge`/`badgeText` are for the per-card outcome pill, which gets the
// same solid metal-surface treatment as the rest of the app's badges
// (e.g. the LICENSED badge) instead of a flat outline.
const BAND_STYLE: Record<Band, { border: string; text: string; badge: string; badgeText: string }> = {
  BEST: { border: "border-l-green", text: "text-green-light", badge: "metal-green-surface", badgeText: "text-black" },
  STANDARD: { border: "border-l-teal", text: "text-teal-light", badge: "metal-teal-surface", badgeText: "text-black" },
  GRADED: { border: "border-l-gold", text: "text-gold", badge: "metal-gold-surface", badgeText: "text-black" },
  GI: { border: "border-l-blue", text: "text-blue-light", badge: "metal-blue-surface", badgeText: "text-white" },
  REVIEW: { border: "border-l-amber", text: "text-amber", badge: "metal-amber-surface", badgeText: "text-white" },
  INELIG: { border: "border-l-border", text: "text-muted", badge: "metal-gray-surface", badgeText: "text-black" },
  DECLINE: { border: "border-l-red", text: "text-red-light", badge: "metal-red-surface", badgeText: "text-white" },
};

// Per-outcome dot color — a finer-grained palette than the band colors
// above (a GRADED-band card can still list an APPROVED line for one
// condition and a GRADED line for another). Inline style, not Tailwind
// classes, since these key off the engine's dynamic outcome strings.
const OUTCOME_DOT: Record<string, string> = {
  APPROVED: "var(--green-light)",
  LEVEL: "var(--green-light)",
  PREFERRED: "var(--green-light)",
  STANDARD: "var(--teal-light)",
  GRADED: "var(--gold)",
  MODIFIED: "var(--gold)",
  BASIC: "var(--gold)",
  ROP: "var(--gold)",
  LEGACY: "var(--gold)",
  GI: "var(--blue-light)",
  DECLINE: "var(--red-light)",
  TIME: "var(--amber)",
  REVIEW: "var(--amber)",
};

function outcomeLabel(outcome: string) {
  if (outcome === "TIME") return "Enter yrs since";
  if (outcome === "NA") return "Not addressed";
  if (outcome === "NS") return "Not specified";
  if (outcome === "REVIEW") return "See rule";
  return TIER_LABEL[outcome] || outcome;
}

function firstUrl(s?: string) {
  const m = String(s || "").match(/https?:\/\/[^\s]+/);
  return m ? m[0] : null;
}

function cardBadge(key: Band, hasSelections: boolean, product: Product, details: VerdictDetail[]) {
  if (key === "BEST") return hasSelections ? "Approved" : "Eligible";
  if (key === "REVIEW") return "Review";
  if (key === "INELIG") return `Age ${product.ageMin ?? "?"}–${product.ageMax ?? "?"}`;
  let badge = BANDS.find((b) => b.key === key)!.label.split(" /")[0];
  if ((key === "GRADED" || key === "STANDARD") && hasSelections) {
    const tiers = details.map((d) => d.outcome).filter((s) => SEVERITY[s]);
    if (tiers.length) {
      const worst = tiers.reduce((a, b) => (SEVERITY[b] > SEVERITY[a] ? b : a));
      badge = TIER_LABEL[worst] || badge;
    }
  }
  return badge;
}

function ProductCard({ band, verdict, hasSelections }: { band: Band; verdict: ProductVerdict & { product: Product }; hasSelections: boolean }) {
  const { product, details } = verdict;
  const style = BAND_STYLE[band];
  const badge = cardBadge(band, hasSelections, product, details);
  const uwGuide = firstUrl(product.build);
  const salesTool = firstUrl(product.sales);
  const quoteTool = firstUrl(product.quote);

  return (
    <div className={cn("rounded-lg border border-border bg-surface2 p-3", "border-l-4", style.border)}>
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div className="font-condensed text-sm font-bold tracking-wide text-foreground uppercase">{product.name}</div>
        <span className={cn("shrink-0 rounded px-2 py-0.5 text-[11px] font-bold whitespace-nowrap", style.badge, style.badgeText)}>
          {badge}
        </span>
      </div>

      {details.length > 0 && (
        <div className="mb-1.5 space-y-1">
          {details.map((d, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs">
              <span
                className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: OUTCOME_DOT[d.outcome] ?? "var(--muted)" }}
              />
              <span className="text-muted">
                <b className="text-foreground">{d.condition}:</b> {outcomeLabel(d.outcome)}
                {d.extraCriteria && <span className="ml-1 text-gold">⚠ extra criteria</span>}
                {d.ruleText && <span className="block text-[11px] text-muted/70">{d.ruleText}</span>}
              </span>
            </div>
          ))}
        </div>
      )}

      <details className="group">
        <summary className="font-condensed cursor-pointer text-[11px] font-bold tracking-[0.1em] text-teal-light uppercase list-none">
          Product details
        </summary>
        <div className="mt-2 space-y-1 text-xs text-muted">
          {product.cov && (
            <div>
              <b className="text-foreground">Type:</b> {product.cov}
            </div>
          )}
          {product.age && (
            <div>
              <b className="text-foreground">Ages:</b> {product.age}
            </div>
          )}
          {product.face && (
            <div>
              <b className="text-foreground">Face:</b> {product.face}
            </div>
          )}
          {product.lb && (
            <div>
              <b className="text-foreground">Living benefits:</b> {product.lb}
            </div>
          )}
          {product.pay && (
            <div>
              <b className="text-foreground">Payment:</b> {product.pay}
            </div>
          )}
          {product.build && !uwGuide && (
            <div>
              <b className="text-foreground">Build:</b> {product.build}
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            {uwGuide && (
              <a href={uwGuide} target="_blank" rel="noopener noreferrer" className="font-condensed rounded border border-border px-2 py-1 text-[11px] font-bold tracking-[0.08em] text-teal-light uppercase hover:border-copper-dim">
                UW Guide
              </a>
            )}
            {salesTool && (
              <a href={salesTool} target="_blank" rel="noopener noreferrer" className="font-condensed rounded border border-border px-2 py-1 text-[11px] font-bold tracking-[0.08em] text-teal-light uppercase hover:border-copper-dim">
                Sales Tool
              </a>
            )}
            {quoteTool && (
              <a href={quoteTool} target="_blank" rel="noopener noreferrer" className="font-condensed rounded border border-border px-2 py-1 text-[11px] font-bold tracking-[0.08em] text-teal-light uppercase hover:border-copper-dim">
                Quote Tool
              </a>
            )}
          </div>
        </div>
      </details>
    </div>
  );
}

export function ResultsBands({ results, hasSelections }: { results: BandedResults | null; hasSelections: boolean }) {
  if (!results) {
    return (
      <div className="rounded-lg border border-border bg-surface2 p-6 text-center text-sm text-muted">
        Enter the client&apos;s info and health conditions, then tap <b className="text-foreground">Run Underwriting</b>.
      </div>
    );
  }

  const nonEmpty = BANDS.filter((b) => results[b.key].length > 0);
  if (!nonEmpty.length) {
    return <div className="rounded-lg border border-border bg-surface2 p-6 text-center text-sm text-muted">No carriers to show.</div>;
  }

  return (
    <div className="space-y-6">
      {nonEmpty.map((b) => {
        const items = results[b.key];
        return (
          <section key={b.key}>
            <div className="mb-2 flex items-center gap-2">
              <h3 className={cn("font-condensed text-sm font-extrabold tracking-[0.1em] uppercase", BAND_STYLE[b.key].text)}>{b.label}</h3>
              <span className="rounded-full bg-surface2 px-2 py-0.5 text-xs font-bold text-muted">{items.length}</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((verdict) => (
                <ProductCard key={verdict.product.id} band={b.key} verdict={verdict} hasSelections={hasSelections} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
