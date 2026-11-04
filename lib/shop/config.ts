import type { ShopLeadTier } from "@prisma/client";

/** Every lead is sold at least this many days old; the tiers are labels on top of that. */
export const SHOP_TIERS: { id: ShopLeadTier; label: string; short: string; priceCents: number }[] = [
  { id: "SIX_PLUS", label: "6+ months", short: "6+", priceCents: 300 },
  { id: "NINE_PLUS", label: "9+ months", short: "9+", priceCents: 150 },
  { id: "TWELVE_PLUS", label: "12+ months", short: "12+", priceCents: 50 },
];

export const SHOP_TIER_IDS = SHOP_TIERS.map((t) => t.id);

export function isShopTier(value: unknown): value is ShopLeadTier {
  return typeof value === "string" && (SHOP_TIER_IDS as string[]).includes(value);
}

export function tierInfo(id: ShopLeadTier) {
  return SHOP_TIERS.find((t) => t.id === id)!;
}

/** Orders below this total are rejected at checkout. */
export const MIN_ORDER_CENTS = 300_00;

/** How long a sold lead stays out of inventory before it can be sold again. */
export const HOLD_DAYS = 30;

/**
 * How long leads stay reserved for an unpaid checkout. Stripe's minimum
 * Checkout Session lifetime is 30 minutes, so this can't go lower.
 */
export const CHECKOUT_RESERVATION_MINUTES = 30;

/** Largest number of leads a single order can contain. */
export const MAX_LEADS_PER_ORDER = 25_000;

export function formatCents(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}
