import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

/**
 * Creates a rated plan under a carrier. `payoutPercent` is entered the same
 * way an agent's own comp level is displayed elsewhere (e.g. 93.75 meaning
 * "93.75%") and stored as the 0-1 fraction the commission math actually
 * uses.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id: carrierId } = await params;
  const body = (await req.json().catch(() => ({}))) as { name?: string; payoutPercent?: number };
  const name = body.name?.trim();
  const payoutPercent = body.payoutPercent;

  if (!name) return NextResponse.json({ error: "Plan name is required" }, { status: 400 });
  if (typeof payoutPercent !== "number" || !Number.isFinite(payoutPercent) || payoutPercent <= 0) {
    return NextResponse.json({ error: "A positive payout percent is required" }, { status: 400 });
  }

  const carrier = await db.carrier.findUnique({ where: { id: carrierId } });
  if (!carrier) return NextResponse.json({ error: "Carrier not found" }, { status: 404 });

  const existing = await db.carrierPlan.findUnique({ where: { carrierId_name: { carrierId, name } } });
  if (existing) return NextResponse.json({ error: "A plan with that name already exists for this carrier" }, { status: 409 });

  const plan = await db.carrierPlan.create({
    data: { carrierId, name, payoutMultiplier: payoutPercent / 100 },
  });

  return NextResponse.json({ plan }, { status: 201 });
}
