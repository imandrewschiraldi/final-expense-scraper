import { db } from "@/lib/db";
import {
  computeCommissionAmount,
  computeCommissionAmountFromGrid,
  parseCompLevelPercent,
  parseCompLevelNumber,
} from "@/lib/commission";

/**
 * Resolves the commission snapshot for a policy at write time.
 *
 * Prefers an exact CarrierPlanRate grid row for the agent's comp level
 * (the real row-by-row carrier grid, e.g. FFL's 80-145 table) when one
 * exists. Falls back to the plan's flat payoutMultiplier × compLevel when
 * no grid row matches — e.g. a product whose grid hasn't been entered yet,
 * or an agent whose comp level doesn't land on a defined tier.
 *
 * Returns null if the agent has no parsable comp level or no carrier plan
 * was picked — a policy is always submittable even before commission data
 * is fully configured, it just won't count toward Commissions Paid yet.
 */
export async function resolveCommissionAmount({
  agentId,
  annualPremium,
  carrierPlanId,
}: {
  agentId: string | null;
  annualPremium: number;
  carrierPlanId: string | null;
}): Promise<number | null> {
  if (!agentId || !carrierPlanId) return null;

  const [agent, plan] = await Promise.all([
    db.user.findUnique({ where: { id: agentId }, select: { compLevel: true } }),
    db.carrierPlan.findUnique({ where: { id: carrierPlanId }, select: { payoutMultiplier: true } }),
  ]);

  const compLevelPercent = parseCompLevelPercent(agent?.compLevel ?? null);
  if (compLevelPercent === null || !plan) return null;

  const compLevelNumber = parseCompLevelNumber(agent?.compLevel ?? null);
  if (compLevelNumber !== null) {
    const gridRow = await db.carrierPlanRate.findUnique({
      where: { carrierPlanId_compLevel: { carrierPlanId, compLevel: compLevelNumber } },
      select: { payoutPercent: true },
    });
    if (gridRow) {
      return computeCommissionAmountFromGrid({
        annualPremium,
        gridPayoutPercent: Number(gridRow.payoutPercent),
      });
    }
  }

  return computeCommissionAmount({
    annualPremium,
    compLevelPercent,
    payoutMultiplier: Number(plan.payoutMultiplier),
  });
}
