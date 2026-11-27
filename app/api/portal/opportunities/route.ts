import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { isLeadType } from "@/lib/leadType";
import { PipelinePhase, Prisma } from "@prisma/client";

const PHASES: PipelinePhase[] = ["LEAD", "CLIENT"];

// Mirrors /api/portal/policies' own scoping: an AGENT only ever sees their
// own book; ADMIN/MANAGER see the whole org unless they explicitly ask for
// just their own (`mine=true`).
function ownScopeOnly(role: string, mine: boolean) {
  return mine || role === "AGENT";
}

export async function GET(req: NextRequest) {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  const { searchParams } = new URL(req.url);
  const phase = searchParams.get("phase") as PipelinePhase | null;
  const leadType = searchParams.get("leadType");
  const mine = searchParams.get("mine") === "true";

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

  const scopeToOwn = ownScopeOnly(guard.session.user.role, mine);
  const agentId = guard.session.user.id;

  if (phase === "LEAD") {
    const where: Prisma.LeadWhereInput = {
      leadType,
      isArchived: false,
      ...(scopeToOwn ? { assignedAgentId: agentId } : {}),
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

  const where: Prisma.PolicyWhereInput = {
    leadType,
    ...(scopeToOwn ? { agentId } : {}),
  };
  const policies = await db.policy.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: { agent: { select: { name: true } }, pipelineStage: true },
  });
  return NextResponse.json({ phase, policies });
}
