import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageChannels } from "@/lib/chat";

export const dynamic = "force-dynamic";

/**
 * Persist a full drag-and-drop reorder of the channels, including moving one
 * between categories (or in/out of the ungrouped list at the top).
 *
 * The client sends every channel's resulting position, not just the ones
 * that moved — a drag can reshuffle both the source and destination
 * container's order in one gesture, so recomputing "what actually changed"
 * server-side would just duplicate work the client already did to render
 * the drop.
 */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageChannels(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { channels } = (await req.json()) as {
    channels?: { id: string; categoryId: string | null; order: number }[];
  };
  if (
    !Array.isArray(channels) ||
    channels.some(
      (c) =>
        typeof c.id !== "string" ||
        (c.categoryId !== null && typeof c.categoryId !== "string") ||
        typeof c.order !== "number",
    )
  ) {
    return NextResponse.json({ error: "channels must be a list of {id, categoryId, order}" }, { status: 400 });
  }

  await db.$transaction(
    channels.map((c) =>
      db.chatChannel.update({ where: { id: c.id }, data: { categoryId: c.categoryId, order: c.order } }),
    ),
  );

  return NextResponse.json({ ok: true });
}
