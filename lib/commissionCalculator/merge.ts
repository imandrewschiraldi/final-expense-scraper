import { COMPANIES, LEVELS, type ProductType, type FflLevel } from "./data";

export type RatedPlan = {
  carrier: string;
  product: string;
  type: ProductType;
  /** Commission percent (e.g. 115 for 115%), or null if unavailable at the
   *  selected level. On a 0-100 scale, same as the fallback table — commission
   *  = annualPremium × (ratePercent / 100). */
  ratePercent: number | null;
  /** "grid"/"multiplier" = came from the portal's real CarrierPlan(Rate)
   *  data; "fallback" = no portal row yet, used the ported standalone
   *  table instead. */
  source: "grid" | "multiplier" | "fallback" | null;
  carrierPlanId: string | null;
};

export type CompanyCatalogEntry = {
  carrier: string;
  products: RatedPlan[];
};

export type PortalCarrierPlan = {
  id: string;
  name: string;
  payoutMultiplier: number;
  grid: { compLevel: number; payoutPercent: number }[];
};
export type PortalCarrier = { id: string; name: string; plans: PortalCarrierPlan[] };

function isFflLevel(n: number | null): n is FflLevel {
  return n !== null && (LEVELS as readonly number[]).includes(n);
}

/** Resolves one plan's rate at one FFL level — an exact CarrierPlanRate grid
 *  row for that level beats the flat payoutMultiplier × level fallback, same
 *  priority order resolveCommissionAmount uses server-side (lib/commissionServer.ts),
 *  just evaluated for whichever level the slider is on instead of the
 *  agent's own account level. */
function resolvePortalRate(plan: PortalCarrierPlan, level: number): { ratePercent: number; source: "grid" | "multiplier" } {
  const gridRow = plan.grid.find((r) => r.compLevel === level);
  if (gridRow) return { ratePercent: gridRow.payoutPercent * 100, source: "grid" };
  return { ratePercent: plan.payoutMultiplier * level, source: "multiplier" };
}

/** Merges the portal's real carrier/plan rate grid with the standalone
 *  tool's ported fallback table — the portal grid is always preferred when
 *  it has a row (or a multiplier) for a plan; the fallback only fills gaps
 *  for plans that haven't been entered into the real grid yet. Never
 *  duplicates the grid: the fallback table is only ever read when no portal
 *  plan matches by carrier+product name. `level` is the FFL level the
 *  calculator's own slider is currently on (not necessarily the agent's own
 *  account level — the slider is fully self-service). */
export function buildCatalog(portalCarriers: PortalCarrier[], level: number): CompanyCatalogEntry[] {
  const portalByCarrier = new Map(portalCarriers.map((c) => [c.name.trim().toLowerCase(), c]));
  const consumedPlanIds = new Set<string>();
  const catalog: CompanyCatalogEntry[] = [];

  for (const [carrierName, data] of Object.entries(COMPANIES)) {
    const portalCarrier = portalByCarrier.get(carrierName.trim().toLowerCase());
    const products: RatedPlan[] = [];
    for (const [productName, pdata] of Object.entries(data.products)) {
      const portalPlan = portalCarrier?.plans.find((p) => p.name.trim().toLowerCase() === productName.trim().toLowerCase());
      if (portalPlan) {
        consumedPlanIds.add(portalPlan.id);
        const resolved = resolvePortalRate(portalPlan, level);
        products.push({
          carrier: carrierName,
          product: productName,
          type: pdata.type,
          ratePercent: resolved.ratePercent,
          source: resolved.source,
          carrierPlanId: portalPlan.id,
        });
      } else {
        const rate = isFflLevel(level) ? pdata.rates[level] : null;
        products.push({
          carrier: carrierName,
          product: productName,
          type: pdata.type,
          ratePercent: rate ?? null,
          source: rate != null ? "fallback" : null,
          carrierPlanId: null,
        });
      }
    }
    // Any portal-only products for this (fallback-listed) carrier that
    // aren't in the fallback table at all — a product an admin added since.
    if (portalCarrier) {
      for (const plan of portalCarrier.plans) {
        if (consumedPlanIds.has(plan.id)) continue;
        consumedPlanIds.add(plan.id);
        const resolved = resolvePortalRate(plan, level);
        products.push({
          carrier: carrierName,
          product: plan.name,
          type: "Other",
          ratePercent: resolved.ratePercent,
          source: resolved.source,
          carrierPlanId: plan.id,
        });
      }
    }
    catalog.push({ carrier: carrierName, products });
  }

  // Carriers that exist only in the portal's own data, not in the fallback
  // table at all (a carrier an admin added since this tool's rate table was
  // last updated).
  for (const portalCarrier of portalCarriers) {
    const inFallback = Object.keys(COMPANIES).some((name) => name.trim().toLowerCase() === portalCarrier.name.trim().toLowerCase());
    if (inFallback) continue;
    catalog.push({
      carrier: portalCarrier.name,
      products: portalCarrier.plans.map((plan) => {
        const resolved = resolvePortalRate(plan, level);
        return {
          carrier: portalCarrier.name,
          product: plan.name,
          type: "Other" as ProductType,
          ratePercent: resolved.ratePercent,
          source: resolved.source,
          carrierPlanId: plan.id,
        };
      }),
    });
  }

  return catalog;
}
