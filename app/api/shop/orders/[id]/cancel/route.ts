import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getBuyerId } from "@/lib/shop/session";
import { releaseOrder } from "@/lib/shop/inventory";
import { expireCheckoutSession } from "@/lib/shop/stripe";

/** Called when a buyer backs out of Stripe checkout, so their leads go back on sale right away. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const buyerId = await getBuyerId();
  if (!buyerId) return NextResponse.json({ error: "Log in to continue." }, { status: 401 });
  const { id } = await params;
  const order = await db.shopOrder.findFirst({
    where: { id, buyerId, status: "PENDING_PAYMENT" },
    select: { stripeSessionId: true },
  });
  if (!order) return NextResponse.json({ ok: true });
  // Expire the Stripe session first so it can't be paid after we release the leads.
  if (order.stripeSessionId) await expireCheckoutSession(order.stripeSessionId);
  await releaseOrder(id);
  return NextResponse.json({ ok: true });
}
