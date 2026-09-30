import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

type RateRow = { compLevel: number; payoutPercent: number };

/**
 * Replaces the entire row-by-row payout grid for a plan in one shot — the
 * admin pastes the whole carrier grid (e.g. FFL's 80-145 table) for a
 * product at once rather than editing rows one at a time. Wipes any
 * existing rows for this plan and inserts the new set inside a
 * transaction, so a re-paste to fix a typo never leaves stale rows behind.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id: carrierPlanId } = await params;
  const body = (await req.json().catch(() => ({}))) as { rows?: RateRow[] };
  const rows = body.rows;

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "At least one grid row is required" }, { status: 400 });
  }
  for (const row of rows) {
    if (
      typeof row.compLevel !== "number" ||
      !Number.isFinite(row.compLevel) ||
      row.compLevel <= 0 ||
      typeof row.payoutPercent !== "number" ||
      !Number.isFinite(row.payoutPercent) ||
      row.payoutPercent <= 0
    ) {
      return NextResponse.json({ error: `Invalid row: level ${row.compLevel}, payout ${row.payoutPercent}` }, { status: 400 });
    }
  }

  const plan = await db.carrierPlan.findUnique({ where: { id: carrierPlanId } });
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  // Last row wins if the same level was pasted twice.
  const byLevel = new Map(rows.map((r) => [r.compLevel, r.payoutPercent]));

  const rates = await db.$transaction([
    db.carrierPlanRate.deleteMany({ where: { carrierPlanId } }),
    db.carrierPlanRate.createManyAndReturn({
      data: [...byLevel.entries()].map(([compLevel, payoutPercent]) => ({
        carrierPlanId,
        compLevel,
        payoutPercent: payoutPercent / 100,
      })),
    }),
  ]).then(([, created]) => created);

  return NextResponse.json({ rates });
}

/** Clears the entire payout grid for a plan, reverting it to the flat payoutMultiplier fallback. */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id: carrierPlanId } = await params;
  await db.carrierPlanRate.deleteMany({ where: { carrierPlanId } });
  return NextResponse.json({ ok: true });
}
