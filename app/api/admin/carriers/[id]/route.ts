import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const { name } = (await req.json().catch(() => ({}))) as { name?: string };
  const cleaned = name?.trim();
  if (!cleaned) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const carrier = await db.carrier.update({ where: { id }, data: { name: cleaned } });
  return NextResponse.json({ carrier });
}

/**
 * Deletes a carrier and every plan under it. Policies that were rated under
 * one of those plans keep their frozen commissionAmount — they just lose
 * the link back to the plan (onDelete: SetNull), same as archiving a Team
 * Chat channel doesn't erase its messages.
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  await db.carrier.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
