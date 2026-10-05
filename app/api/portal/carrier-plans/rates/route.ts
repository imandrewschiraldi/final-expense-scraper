import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { parseCompLevelNumber, parseCompLevelPercent } from "@/lib/commission";

/** Per-plan commission rates at the signed-in agent's own comp level — the
 *  Commission Calculator's rate source. Prefers an exact CarrierPlanRate
 *  grid row for the agent's level (the real row-by-row carrier grid, same
 *  priority order as resolveCommissionAmount in lib/commissionServer.ts),
 *  falling back to the plan's flat payoutMultiplier × compLevel. The agent
 *  never gets to pick a different level here — there is no override, by
 *  design: they can't self-quote a contract level they aren't on. */
export async function GET() {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  const user = await db.user.findUnique({
    where: { id: guard.session.user.id },
    select: { compLevel: true },
  });
  const compLevelNumber = parseCompLevelNumber(user?.compLevel ?? null);
  const compLevelPercent = parseCompLevelPercent(user?.compLevel ?? null);

  const carriers = await db.carrier.findMany({
    orderBy: { name: "asc" },
    include: {
      plans: {
        orderBy: { name: "asc" },
        include: {
          rates: compLevelNumber !== null ? { where: { compLevel: compLevelNumber } } : false,
        },
      },
    },
  });

  const result = carriers.map((c) => ({
    id: c.id,
    name: c.name,
    plans: c.plans.map((p) => {
      const gridRow = p.rates?.[0];
      let ratePercent: number | null = null;
      let source: "grid" | "multiplier" | null = null;
      if (gridRow) {
        ratePercent = Number(gridRow.payoutPercent) * 100;
        source = "grid";
      } else if (compLevelPercent !== null) {
        ratePercent = Number(p.payoutMultiplier) * compLevelPercent * 100;
        source = "multiplier";
      }
      return { id: p.id, name: p.name, ratePercent, source };
    }),
  }));

  return NextResponse.json({
    compLevel: compLevelNumber,
    compLevelRaw: user?.compLevel ?? null,
    carriers: result,
  });
}
