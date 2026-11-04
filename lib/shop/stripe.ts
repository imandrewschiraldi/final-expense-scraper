import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Minimal Stripe client over the REST API (no SDK dependency). Needs
 * STRIPE_SECRET_KEY for checkout and STRIPE_WEBHOOK_SECRET for the webhook.
 */
export function stripeConfigured() {
  return !!process.env.STRIPE_SECRET_KEY;
}

function encode(obj: Record<string, unknown>, prefix = ""): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === "object") out.push(...encode(v as Record<string, unknown>, key));
    else out.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
  }
  return out;
}

async function stripePost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: encode(body).join("&"),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Stripe ${path} failed: ${json?.error?.message ?? res.status}`);
  return json as T;
}

export async function createCheckoutSession(params: {
  orderId: string;
  email: string;
  lineItems: { name: string; unitAmountCents: number; quantity: number }[];
  successUrl: string;
  cancelUrl: string;
  expiresAt: Date;
}) {
  const line_items: Record<string, unknown> = {};
  params.lineItems.forEach((li, i) => {
    line_items[i] = {
      price_data: { currency: "usd", unit_amount: li.unitAmountCents, product_data: { name: li.name } },
      quantity: li.quantity,
    };
  });
  return stripePost<{ id: string; url: string }>("checkout/sessions", {
    mode: "payment",
    customer_email: params.email,
    client_reference_id: params.orderId,
    metadata: { orderId: params.orderId },
    line_items,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    expires_at: Math.floor(params.expiresAt.getTime() / 1000),
  });
}

export async function expireCheckoutSession(sessionId: string) {
  try {
    await stripePost(`checkout/sessions/${sessionId}/expire`, {});
  } catch {
    // Already completed or expired — nothing to do.
  }
}

/** Verifies the Stripe-Signature header against the raw request body. */
export function verifyStripeSignature(rawBody: string, header: string | null, toleranceSeconds = 300) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i), p.slice(i + 1)];
    }),
  );
  const t = parts.t;
  const signatures = header
    .split(",")
    .filter((p) => p.startsWith("v1="))
    .map((p) => p.slice(3));
  if (!t || signatures.length === 0) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > toleranceSeconds) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex"));
  return signatures.some((s) => {
    const given = Buffer.from(s);
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}
