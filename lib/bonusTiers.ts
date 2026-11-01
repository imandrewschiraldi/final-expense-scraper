// The agency's personal-production bonus schedule — paid on an agent's own
// issued premium for the calendar year, same window as Hall of Fame.
// Confirmed directly with the agency; change here only on an explicit
// instruction to update the schedule, not as a guess.
export type BonusTier = { threshold: number; bonus: number };

export const BONUS_TIERS: BonusTier[] = [
  { threshold: 20_000, bonus: 650 },
  { threshold: 30_000, bonus: 1_200 },
  { threshold: 40_000, bonus: 1_600 },
  { threshold: 50_000, bonus: 2_000 },
  { threshold: 75_000, bonus: 4_000 },
  { threshold: 100_000, bonus: 8_000 },
  { threshold: 125_000, bonus: 10_000 },
  { threshold: 150_000, bonus: 15_000 },
  { threshold: 200_000, bonus: 20_000 },
];

/** The highest tier already reached, or null if issuedAP hasn't hit the first one. */
export function currentBonusTier(issuedAP: number): BonusTier | null {
  let current: BonusTier | null = null;
  for (const tier of BONUS_TIERS) {
    if (issuedAP >= tier.threshold) current = tier;
  }
  return current;
}

/** The next tier still ahead, or null once the top tier is reached. */
export function nextBonusTier(issuedAP: number): BonusTier | null {
  return BONUS_TIERS.find((t) => issuedAP < t.threshold) ?? null;
}
