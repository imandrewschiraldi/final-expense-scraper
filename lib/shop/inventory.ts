import type { ShopLeadTier } from "@prisma/client";
import { db } from "@/lib/db";
import { CHECKOUT_RESERVATION_MINUTES, HOLD_DAYS, SHOP_TIER_IDS } from "@/lib/shop/config";

type TxClient = Parameters<Parameters<typeof db.$transaction>[0]>[0];

export type StateCounts = Record<string, number>;
export type Inventory = {
  byTier: Record<ShopLeadTier, StateCounts>;
  tierTotals: Record<ShopLeadTier, number>;
  available: number;
  held: number;
  reserved: number;
};

/** Live counts of what a buyer can order right now, per age group and state. */
export async function getInventory(): Promise<Inventory> {
  await expireStaleCheckouts();
  const [groups, statusCounts] = await Promise.all([
    db.shopLead.groupBy({ by: ["tier", "state"], where: { status: "AVAILABLE" }, _count: { _all: true } }),
    db.shopLead.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const byTier = { SIX_PLUS: {}, NINE_PLUS: {}, TWELVE_PLUS: {} } as Record<ShopLeadTier, StateCounts>;
  const tierTotals = { SIX_PLUS: 0, NINE_PLUS: 0, TWELVE_PLUS: 0 } as Record<ShopLeadTier, number>;
  for (const g of groups) {
    byTier[g.tier][g.state] = g._count._all;
    tierTotals[g.tier] += g._count._all;
  }
  const status = (s: string) => statusCounts.find((c) => c.status === s)?._count._all ?? 0;
  return { byTier, tierTotals, available: status("AVAILABLE"), held: status("HELD"), reserved: status("RESERVED") };
}

export class ShortageError extends Error {
  constructor(
    public state: string,
    public available: number,
  ) {
    super(`Only ${available} leads are left in ${state}.`);
  }
}

/**
 * Pulls random available leads into an order. Random order plus row locks
 * (SKIP LOCKED) means two buyers ordering the same state at the same moment
 * never get the same lead, and no two orders are ever the same batch.
 * Runs inside the caller's transaction so a shortage in any one state rolls
 * back the whole order.
 */
export async function reserveLeads(
  tx: TxClient,
  orderId: string,
  tier: ShopLeadTier,
  items: Record<string, number>,
) {
  for (const [state, qty] of Object.entries(items)) {
    const reserved = await tx.$executeRaw`
      UPDATE shop_leads SET status = 'RESERVED', "reservedOrderId" = ${orderId}
      WHERE id IN (
        SELECT id FROM shop_leads
        WHERE status = 'AVAILABLE' AND tier = ${tier}::"ShopLeadTier" AND state = ${state}
        ORDER BY random()
        LIMIT ${qty}
        FOR UPDATE SKIP LOCKED
      )`;
    // Short means every available lead in the state got grabbed, so `reserved`
    // is how many there are (the transaction rollback puts them back).
    if (reserved < qty) throw new ShortageError(state, reserved);
  }
}

/** Puts an unpaid order's leads back in stock and marks the order expired. */
export async function releaseOrder(orderId: string) {
  await db.$transaction(async (tx) => {
    const updated = await tx.shopOrder.updateMany({
      where: { id: orderId, status: "PENDING_PAYMENT" },
      data: { status: "EXPIRED" },
    });
    if (updated.count === 0) return;
    await tx.shopLead.updateMany({
      where: { reservedOrderId: orderId, status: "RESERVED" },
      data: { status: "AVAILABLE", reservedOrderId: null },
    });
  });
}

/**
 * Safety net for checkouts Stripe never told us about (webhook missed, tab
 * closed before the session was created). Stripe sessions expire after
 * CHECKOUT_RESERVATION_MINUTES, so anything well past that can't be paid.
 */
export async function expireStaleCheckouts() {
  const cutoff = new Date(Date.now() - (CHECKOUT_RESERVATION_MINUTES + 30) * 60_000);
  const stale = await db.shopOrder.findMany({
    where: { status: "PENDING_PAYMENT", createdAt: { lt: cutoff } },
    select: { id: true },
    take: 200,
  });
  for (const o of stale) await releaseOrder(o.id);
  return stale.length;
}

/**
 * Marks a paid order's leads as sold and starts their 30-day hold. Safe to
 * call more than once for the same order (Stripe retries webhooks): only the
 * first call moves the order out of PENDING_PAYMENT. Returns false when the
 * order wasn't waiting on payment.
 */
export async function markOrderPaid(orderId: string): Promise<boolean> {
  return db.$transaction(async (tx) => {
    const now = new Date();
    const updated = await tx.shopOrder.updateMany({
      where: { id: orderId, status: "PENDING_PAYMENT" },
      data: { status: "PAID", paidAt: now },
    });
    if (updated.count === 0) return false;
    const holdUntil = new Date(now.getTime() + HOLD_DAYS * 24 * 60 * 60_000);
    await tx.$executeRaw`
      INSERT INTO shop_order_leads ("orderId", "leadId")
      SELECT ${orderId}, id FROM shop_leads WHERE "reservedOrderId" = ${orderId} AND status = 'RESERVED'
      ON CONFLICT DO NOTHING`;
    await tx.shopLead.updateMany({
      where: { reservedOrderId: orderId, status: "RESERVED" },
      data: { status: "HELD", holdUntil, lastSoldAt: now, timesSold: { increment: 1 }, reservedOrderId: null },
    });
    return true;
  });
}

/**
 * Daily: leads whose 30-day hold is over go back on sale, each re-assigned to
 * a random age group so returning stock is spread across all three.
 */
export async function releaseExpiredHolds() {
  const released = await db.$executeRaw`
    UPDATE shop_leads
    SET status = 'AVAILABLE', "holdUntil" = NULL,
        tier = (ARRAY['SIX_PLUS', 'NINE_PLUS', 'TWELVE_PLUS']::"ShopLeadTier"[])[floor(random() * 3)::int + 1]
    WHERE status = 'HELD' AND "holdUntil" <= ${new Date()}`;
  const expired = await expireStaleCheckouts();
  return { released, expiredCheckouts: expired };
}

/** Shuffles rows and deals them into the three age groups as evenly as possible. */
export function dealIntoTiers<T>(rows: T[]): (T & { tier: ShopLeadTier })[] {
  const shuffled = [...rows];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  // Random starting tier so leftovers from many small uploads don't all land in 6+.
  const offset = Math.floor(Math.random() * 3);
  return shuffled.map((row, i) => ({ ...row, tier: SHOP_TIER_IDS[(i + offset) % 3] }));
}
