import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { US_STATE_CODES } from "@/lib/usStates";
import { getBuyer } from "@/lib/shop/session";
import {
  CHECKOUT_RESERVATION_MINUTES,
  MAX_LEADS_PER_ORDER,
  MIN_ORDER_CENTS,
  formatCents,
  isShopTier,
  tierInfo,
} from "@/lib/shop/config";
import { ShortageError, expireStaleCheckouts, releaseOrder, reserveLeads } from "@/lib/shop/inventory";
import { createCheckoutSession, stripeConfigured } from "@/lib/shop/stripe";

export async function POST(req: NextRequest) {
  const buyer = await getBuyer();
  if (!buyer) return NextResponse.json({ error: "Log in or create an account to buy leads." }, { status: 401 });
  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Checkout isn't set up yet. Please try again later." }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  if (!isShopTier(body?.tier)) return NextResponse.json({ error: "Choose a lead age." }, { status: 400 });
  const tier = body.tier;

  const items: Record<string, number> = {};
  for (const [state, raw] of Object.entries((body?.items ?? {}) as Record<string, unknown>)) {
    const qty = Number(raw);
    if (!US_STATE_CODES.has(state) || !Number.isInteger(qty) || qty < 0) {
      return NextResponse.json({ error: `Invalid quantity for ${state}.` }, { status: 400 });
    }
    if (qty > 0) items[state] = qty;
  }
  const leadCount = Object.values(items).reduce((s, n) => s + n, 0);
  if (leadCount === 0) return NextResponse.json({ error: "Add at least one state to your order." }, { status: 400 });
  if (leadCount > MAX_LEADS_PER_ORDER) {
    return NextResponse.json(
      { error: `Orders are limited to ${MAX_LEADS_PER_ORDER.toLocaleString("en-US")} leads. Split it into two orders.` },
      { status: 400 },
    );
  }

  const { priceCents, label } = tierInfo(tier);
  const totalCents = leadCount * priceCents;
  if (totalCents < MIN_ORDER_CENTS) {
    return NextResponse.json(
      { error: `The minimum order is ${formatCents(MIN_ORDER_CENTS)}. Your order is ${formatCents(totalCents)}.` },
      { status: 400 },
    );
  }

  const deliverTo = typeof body?.email === "string" && body.email.trim() ? body.email.trim() : buyer.email;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(deliverTo)) {
    return NextResponse.json({ error: "Enter a valid email address for delivery." }, { status: 400 });
  }

  await expireStaleCheckouts();

  let orderId: string;
  try {
    orderId = await db.$transaction(
      async (tx) => {
        const order = await tx.shopOrder.create({
          data: {
            buyerId: buyer.id,
            tier,
            items,
            leadCount,
            unitPriceCents: priceCents,
            totalCents,
            deliverToEmail: deliverTo,
          },
          select: { id: true },
        });
        await reserveLeads(tx, order.id, tier, items);
        return order.id;
      },
      { timeout: 60_000 },
    );
  } catch (err) {
    if (err instanceof ShortageError) {
      return NextResponse.json(
        { error: `Only ${err.available.toLocaleString("en-US")} ${label} leads are left in ${err.state}. Lower that quantity and try again.` },
        { status: 409 },
      );
    }
    throw err;
  }

  try {
    const origin = process.env.SHOP_BASE_URL ?? req.nextUrl.origin;
    const session = await createCheckoutSession({
      orderId,
      email: buyer.email,
      lineItems: Object.entries(items)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([state, quantity]) => ({
          name: `Veteran final expense leads, ${label}, ${state}`,
          unitAmountCents: priceCents,
          quantity,
        })),
      successUrl: `${origin}/shop/orders?paid=${orderId}`,
      cancelUrl: `${origin}/shop?canceled=${orderId}`,
      expiresAt: new Date(Date.now() + (CHECKOUT_RESERVATION_MINUTES + 1) * 60_000),
    });
    await db.shopOrder.update({ where: { id: orderId }, data: { stripeSessionId: session.id } });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    await releaseOrder(orderId);
    console.error(err);
    return NextResponse.json({ error: "We couldn't start checkout. Please try again." }, { status: 502 });
  }
}
