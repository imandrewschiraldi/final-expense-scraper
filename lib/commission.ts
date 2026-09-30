// Pure commission-math helpers — no `db` import, safe to import from a
// client component if a display ever needs it, same reason lib/chat.ts
// stays free of Prisma.

/** The "9-month advance" — the fraction of first-year commission a carrier
 *  fronts immediately; the rest trickles in as earned over the policy's
 *  final three months. One constant for every carrier for now. Applied at
 *  display time only (e.g. the Commissions Paid card's Advance toggle) —
 *  the stored commissionAmount itself is always the full, un-advanced
 *  figure, since the advance is a payment-timing convention, not a fact
 *  about what the sale itself is worth. */
export const COMMISSION_ADVANCE_RATE = 0.75;

/** Parses a comp level string like "80%" into a 0-1 fraction. Same regex
 *  personalDashboard.ts already used for the INCOME goal calculation. */
export function parseCompLevelPercent(compLevel: string | null | undefined): number | null {
  if (!compLevel) return null;
  const match = compLevel.match(/(\d+(?:\.\d+)?)\s*%/);
  if (!match) return null;
  const pct = Number(match[1]);
  return Number.isFinite(pct) ? pct / 100 : null;
}

/** Parses a comp level string like "115%" into the raw tier number (115),
 *  for matching against a CarrierPlanRate grid row's compLevel column —
 *  the grid is keyed by the whole number, not the 0-1 fraction. */
export function parseCompLevelNumber(compLevel: string | null | undefined): number | null {
  const pct = parseCompLevelPercent(compLevel);
  return pct === null ? null : Math.round(pct * 100);
}

/**
 * The full first-year commission a sale is worth: AP × the agent's own comp
 * level × how much of that level this specific carrier plan pays out (its
 * payoutMultiplier — 1 means "full level", less than 1 means the plan pays
 * a reduced share of the agent's contract). Not advance-adjusted — see
 * COMMISSION_ADVANCE_RATE for that.
 */
export function computeCommissionAmount({
  annualPremium,
  compLevelPercent,
  payoutMultiplier,
}: {
  annualPremium: number;
  compLevelPercent: number;
  payoutMultiplier: number;
}): number {
  return annualPremium * compLevelPercent * payoutMultiplier;
}

/**
 * The full first-year commission a sale is worth when an exact
 * CarrierPlanRate grid row exists for the agent's comp level: AP × that
 * row's payout percent directly — the grid value already is the actual
 * payout for that level/product combination, not a fraction to multiply
 * against compLevel. Not advance-adjusted — see COMMISSION_ADVANCE_RATE.
 */
export function computeCommissionAmountFromGrid({
  annualPremium,
  gridPayoutPercent,
}: {
  annualPremium: number;
  gridPayoutPercent: number;
}): number {
  return annualPremium * gridPayoutPercent;
}
