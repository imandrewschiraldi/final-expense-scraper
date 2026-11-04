import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { markOrderPaid, releaseOrder } from "@/lib/shop/inventory";
import { deliverOrder } from "@/lib/shop/delivery";
import { verifyStripeSignature } from "@/lib/shop/stripe";

export const maxDuration = 120;

type CheckoutSession = { id: string; payment_status?: string; metadata?: { orderId?: string } };

async function orderIdFor(session: CheckoutSession) {
  if (session.metadata?.orderId) return session.metadata.orderId;
  const order = await db.shopOrder.findUnique({ where: { stripeSessionId: session.id }, select: { id: true } });
  return order?.id ?? null;
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifyStripeSignature(raw, req.headers.get("stripe-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  const event = JSON.parse(raw) as { type: string; data: { object: CheckoutSession } };
  const session = event.data.object;

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    if (session.payment_status !== "paid") return NextResponse.json({ received: true });
    const orderId = await orderIdFor(session);
    if (!orderId) return NextResponse.json({ received: true });

    const order = await db.shopOrder.findUnique({ where: { id: orderId }, select: { status: true } });
    if (order?.status === "EXPIRED") {
      // Shouldn't happen (the Stripe session expires before we release its
      // leads), but if it does the buyer paid for leads we no longer hold —
      // surface it loudly so an admin can refund or fill it by hand.
      console.error(`[lead-shop] Payment received for expired order ${orderId}; needs manual review.`);
      return NextResponse.json({ received: true });
    }

    await markOrderPaid(orderId);
    const fresh = await db.shopOrder.findUnique({ where: { id: orderId }, select: { status: true } });
    if (fresh?.status === "PAID") {
      try {
        await deliverOrder(orderId);
      } catch (err) {
        // Leads are already held for the buyer; they can resend from My Orders.
        console.error(err);
      }
    }
  } else if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
    const orderId = await orderIdFor(session);
    if (orderId) await releaseOrder(orderId);
  }

  return NextResponse.json({ received: true });
}
