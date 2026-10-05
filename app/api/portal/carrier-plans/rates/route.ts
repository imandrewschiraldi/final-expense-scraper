import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { parseCompLevelNumber } from "@/lib/commission";

/** Every plan's full rate grid (every CarrierPlanRate row it has, plus its
 *  flat payoutMultiplier fallback) — the Commission Calculator's rate
 *  source. The calculator has its own self-service FFL level slider (80 to
 *  145, matching the standalone tool it was ported from), so unlike
 *  resolveCommissionAmount in lib/commissionServer.ts this can't resolve to
 *  a single number server-side — it hands back the whole grid and lets the
 *  client compute whichever level the slider is on, same priority order
 *  (an exact grid row beats the multiplier fallback) for every level. */
export async function GET() {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  const user = await db.user.findUnique({
    where: { id: guard.session.user.id },
    select: { compLevel: true },
  });

  const carriers = await db.carrier.findMany({
    orderBy: { name: "asc" },
    include: {
      plans: {
        orderBy: { name: "asc" },
        include: { rates: true },
      },
    },
  });

  const result = carriers.map((c) => ({
    id: c.id,
    name: c.name,
    plans: c.plans.map((p) => ({
      id: p.id,
      name: p.name,
      payoutMultiplier: Number(p.payoutMultiplier),
      grid: p.rates.map((r) => ({ compLevel: r.compLevel, payoutPercent: Number(r.payoutPercent) })),
    })),
  }));

  return NextResponse.json({
    agentCompLevel: parseCompLevelNumber(user?.compLevel ?? null),
    carriers: result,
  });
}
