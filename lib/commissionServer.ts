import { db } from "@/lib/db";
import { computeCommissionAmount, parseCompLevelPercent } from "@/lib/commission";

/**
 * Resolves the commission snapshot for a policy at write time.
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

  return computeCommissionAmount({
    annualPremium,
    compLevelPercent,
    payoutMultiplier: Number(plan.payoutMultiplier),
  });
}
