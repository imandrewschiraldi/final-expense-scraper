import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { isPipelineStageColorToken } from "@/lib/pipelineStageColors";
import { PipelinePhase } from "@prisma/client";

const PHASES: PipelinePhase[] = ["LEAD", "CLIENT"];
const MAX_NAME = 60;

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { searchParams } = new URL(req.url);
  const phase = searchParams.get("phase") as PipelinePhase | null;

  const stages = await db.pipelineStage.findMany({
    where: phase && PHASES.includes(phase) ? { phase } : {},
    orderBy: [{ phase: "asc" }, { order: "asc" }],
  });

  return NextResponse.json({ stages });
}

// Admin-added stages are always purely organizational — systemKey is never
// set here, only by the seed route for the fixed set this feature ships
// with (see lib/pipelineStages.ts).
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const body = await req.json().catch(() => null);
  const phase = body?.phase as PipelinePhase | undefined;
  const name =
    typeof body?.name === "string" ? body.name.trim().slice(0, MAX_NAME) : "";
  const colorToken =
    typeof body?.colorToken === "string" ? body.colorToken : "";

  if (!phase || !PHASES.includes(phase)) {
    return NextResponse.json(
      { error: "A valid phase is required." },
      { status: 400 },
    );
  }
  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  if (!isPipelineStageColorToken(colorToken)) {
    return NextResponse.json(
      { error: "A valid color is required." },
      { status: 400 },
    );
  }

  const last = await db.pipelineStage.findFirst({
    where: { phase },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const stage = await db.pipelineStage.create({
    data: {
      phase,
      name,
      colorToken,
      order: (last?.order ?? -1) + 1,
      systemKey: null,
    },
  });

  return NextResponse.json({ stage });
}

// Persists a drag-and-drop reorder within a single phase — mirrors the
// lead-vendors reorder endpoint's shape ({ reorder: [ids] }), scoped to one
// phase since the two stage lists are reordered independently.
export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const body = await req.json().catch(() => null);
  const phase = body?.phase as PipelinePhase | undefined;
  const ids = Array.isArray(body?.reorder)
    ? body.reorder.filter((id: unknown): id is string => typeof id === "string")
    : null;

  if (!phase || !PHASES.includes(phase)) {
    return NextResponse.json(
      { error: "A valid phase is required." },
      { status: 400 },
    );
  }
  if (!ids) {
    return NextResponse.json(
      { error: "reorder must be an array of ids." },
      { status: 400 },
    );
  }

  await db.$transaction(
    ids.map((id: string, index: number) =>
      db.pipelineStage.update({ where: { id }, data: { order: index } }),
    ),
  );
  return NextResponse.json({ ok: true });
}
