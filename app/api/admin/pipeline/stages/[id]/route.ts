import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { isPipelineStageColorToken } from "@/lib/pipelineStageColors";

const MAX_NAME = 60;

// Renaming/recoloring is allowed on every stage, system ones included (an
// admin can relabel "Not Interested" or change its color) — only the
// systemKey itself is immutable, and it's never accepted here.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const existing = await db.pipelineStage.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Stage not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const data: { name?: string; colorToken?: string } = {};

  if (typeof body?.name === "string") {
    const name = body.name.trim().slice(0, MAX_NAME);
    if (!name)
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    data.name = name;
  }
  if (typeof body?.colorToken === "string") {
    if (!isPipelineStageColorToken(body.colorToken)) {
      return NextResponse.json(
        { error: "A valid color is required." },
        { status: 400 },
      );
    }
    data.colorToken = body.colorToken;
  }

  const stage = await db.pipelineStage.update({ where: { id }, data });
  return NextResponse.json({ stage });
}

// A system stage (systemKey set) backs real business logic — the Vault
// state machine, Hall of Fame, the Leaderboard — and can never be removed,
// only relabeled/recolored/reordered above. Only purely organizational
// stages an admin added themselves can be deleted.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const existing = await db.pipelineStage.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Stage not found" }, { status: 404 });
  }
  if (existing.systemKey) {
    return NextResponse.json(
      { error: "This stage is required and can't be deleted." },
      { status: 400 },
    );
  }

  await db.pipelineStage.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
