import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageChannels } from "@/lib/chat";

export const dynamic = "force-dynamic";

/**
 * Persist a full drag-and-drop reorder of the categories.
 *
 * The client already holds every category in state, so it just sends the
 * complete new order back rather than a single before/after pair — simpler
 * than reconstructing "what moved relative to what" server-side.
 */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageChannels(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { categoryIds } = (await req.json()) as { categoryIds?: string[] };
  if (!Array.isArray(categoryIds) || categoryIds.some((id) => typeof id !== "string")) {
    return NextResponse.json({ error: "categoryIds must be a list of ids" }, { status: 400 });
  }

  await db.$transaction(
    categoryIds.map((id, order) => db.chatCategory.update({ where: { id }, data: { order } })),
  );

  return NextResponse.json({ ok: true });
}
