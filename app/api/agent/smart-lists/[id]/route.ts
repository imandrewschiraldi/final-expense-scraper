import { NextRequest, NextResponse } from "next/server";
import { requireAgent } from "@/lib/apiAuth";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAgent();
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const ownerId = guard.session.user.id;

  const existing = await db.smartList.findFirst({ where: { id, ownerId } });
  if (!existing) {
    return NextResponse.json({ error: "Smart list not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const data: Record<string, unknown> = {};
  if (typeof body?.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (body?.filterConditions !== undefined) data.filterConditions = body.filterConditions;
  if (Array.isArray(body?.visibleColumns)) data.visibleColumns = body.visibleColumns;
  if (body?.sortConfig !== undefined) data.sortConfig = body.sortConfig;
  if (typeof body?.pageSize === "number") data.pageSize = body.pageSize;
  if (typeof body?.order === "number") data.order = body.order;
  if (typeof body?.isGlobal === "boolean") data.isGlobal = body.isGlobal;

  const smartList = await db.smartList.update({ where: { id }, data });
  return NextResponse.json({ smartList });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAgent();
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const ownerId = guard.session.user.id;

  const result = await db.smartList.deleteMany({ where: { id, ownerId } });
  if (result.count === 0) {
    return NextResponse.json({ error: "Smart list not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
