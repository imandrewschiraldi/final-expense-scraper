import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { isLeadType } from "@/lib/leadType";
import { PipelinePhase, Prisma } from "@prisma/client";

const PHASES: PipelinePhase[] = ["LEAD", "CLIENT"];

export async function GET(req: NextRequest) {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  const { searchParams } = new URL(req.url);
  const phase = searchParams.get("phase") as PipelinePhase | null;
  const leadType = searchParams.get("leadType");

  if (!phase || !PHASES.includes(phase)) {
    return NextResponse.json(
      { error: "A valid phase is required." },
      { status: 400 },
    );
  }
  if (!leadType || !isLeadType(leadType)) {
    return NextResponse.json(
      { error: "A valid leadType is required." },
      { status: 400 },
    );
  }

  // Book of Business is always the viewing agent's own book — whoever's
  // account this is, admin and manager roles included, only ever sees
  // leads/policies assigned to them here. A shared/unclaimed Vault lead
  // (no assignedAgentId yet) never matches this filter, so it only shows
  // up in a pipeline once that agent actually claims it.
  const agentId = guard.session.user.id;

  if (phase === "LEAD") {
    const where: Prisma.LeadWhereInput = {
      leadType,
      isArchived: false,
      assignedAgentId: agentId,
    };
    const leads = await db.lead.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        assignedAgent: { select: { name: true } },
        pipelineStage: true,
      },
    });
    return NextResponse.json({ phase, leads });
  }

  const where: Prisma.PolicyWhereInput = { leadType, agentId };
  const policies = await db.policy.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: { agent: { select: { name: true } }, pipelineStage: true },
  });
  return NextResponse.json({ phase, policies });
}
