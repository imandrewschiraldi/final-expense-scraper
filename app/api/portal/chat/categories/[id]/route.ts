import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageChannels, cleanName } from "@/lib/chat";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageChannels(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const name = cleanName(((await req.json()) as { name?: string }).name);
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const category = await db.chatCategory.update({ where: { id }, data: { name } });
  return NextResponse.json({ category });
}

/**
 * Delete a category. Its channels are not deleted — the schema sets their
 * categoryId to null, so they fall back to the ungrouped list at the top of
 * the rail rather than disappearing along with the heading.
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageChannels(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await db.chatCategory.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
