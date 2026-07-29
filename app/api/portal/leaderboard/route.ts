import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { DATE_RANGES, DateRange, rangeStart } from "@/lib/dashboardMetrics";

export async function GET(req: NextRequest) {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  const { searchParams } = new URL(req.url);
  const rangeParam = searchParams.get("range");
  const range: DateRange = DATE_RANGES.includes(rangeParam as DateRange) ? (rangeParam as DateRange) : "mtd";
  const since = rangeStart(range);

  const policies = await db.policy.findMany({
    where: { status: "ISSUED", issuedAt: { gte: since }, agentId: { not: null } },
    select: { annualPremium: true, agent: { select: { id: true, name: true, profileImageUrl: true } } },
  });

  const byAgent = new Map<string, { id: string; name: string; profileImageUrl: string | null; issuedAP: number; issuedCount: number }>();
  for (const p of policies) {
    if (!p.agent) continue;
    const entry = byAgent.get(p.agent.id) ?? {
      id: p.agent.id,
      name: p.agent.name,
      profileImageUrl: p.agent.profileImageUrl,
      issuedAP: 0,
      issuedCount: 0,
    };
    entry.issuedAP += Number(p.annualPremium);
    entry.issuedCount += 1;
    byAgent.set(p.agent.id, entry);
  }

  const rankings = Array.from(byAgent.values()).sort((a, b) => b.issuedAP - a.issuedAP);

  return NextResponse.json({ range, rankings });
}
