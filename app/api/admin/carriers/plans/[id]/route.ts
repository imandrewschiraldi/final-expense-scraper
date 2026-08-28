import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { name?: string; payoutPercent?: number };

  const name = body.name === undefined ? undefined : body.name.trim();
  if (body.name !== undefined && !name) {
    return NextResponse.json({ error: "Plan name is required" }, { status: 400 });
  }
  if (
    body.payoutPercent !== undefined &&
    (typeof body.payoutPercent !== "number" || !Number.isFinite(body.payoutPercent) || body.payoutPercent <= 0)
  ) {
    return NextResponse.json({ error: "A positive payout percent is required" }, { status: 400 });
  }

  const plan = await db.carrierPlan.update({
    where: { id },
    data: {
      ...(name ? { name } : {}),
      ...(body.payoutPercent !== undefined ? { payoutMultiplier: body.payoutPercent / 100 } : {}),
    },
  });

  return NextResponse.json({ plan });
}

/**
 * Deletes a plan. Policies previously rated under it keep their frozen
 * commissionAmount — they just lose the link (onDelete: SetNull).
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  await db.carrierPlan.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
