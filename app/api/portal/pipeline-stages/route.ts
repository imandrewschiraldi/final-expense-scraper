import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { PipelinePhase } from "@prisma/client";

const PHASES: PipelinePhase[] = ["LEAD", "CLIENT"];

// Read-only, any authenticated role — unlike /api/admin/pipeline/stages,
// agents need this to render Book of Business's board columns and stage
// pickers, not just admins managing the stage list itself.
export async function GET(req: NextRequest) {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  const { searchParams } = new URL(req.url);
  const phase = searchParams.get("phase") as PipelinePhase | null;

  const stages = await db.pipelineStage.findMany({
    where: phase && PHASES.includes(phase) ? { phase } : {},
    orderBy: [{ phase: "asc" }, { order: "asc" }],
  });

  return NextResponse.json({ stages });
}
