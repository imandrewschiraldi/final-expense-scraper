// Pure commission-math helpers — no `db` import, safe to import from a
// client component if a display ever needs it, same reason lib/chat.ts
// stays free of Prisma.

/** The "9-month advance" — the fraction of first-year commission a carrier
 *  fronts immediately; the rest trickles in as earned over the policy's
 *  final three months. One constant for every carrier for now. */
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

/**
 * The commission actually advanced on a sale: AP × the 9-month advance ×
 * the agent's own comp level × how much of that level this specific
 * carrier plan pays out (its payoutMultiplier — 1 means "full level", less
 * than 1 means the plan pays a reduced share of the agent's contract).
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
  return annualPremium * COMMISSION_ADVANCE_RATE * compLevelPercent * payoutMultiplier;
}
