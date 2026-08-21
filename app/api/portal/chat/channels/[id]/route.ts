import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { CHAT_TOPIC_MAX, canManageChannels, cleanName } from "@/lib/chat";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Rename, re-topic, re-group or re-gate a channel. */
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageChannels(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await req.json()) as {
    name?: string;
    topic?: string | null;
    minRole?: string;
    categoryId?: string | null;
    restricted?: boolean;
    memberIds?: string[];
  };

  const name = body.name === undefined ? undefined : cleanName(body.name);
  if (body.name !== undefined && !name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const memberIds = [...new Set((body.memberIds ?? []).filter((v): v is string => typeof v === "string"))];
  if (body.restricted === true && memberIds.length === 0) {
    return NextResponse.json({ error: "Select at least one person" }, { status: 400 });
  }

  // The slug is left alone on rename: it is what a bookmarked URL points at,
  // and renaming a channel is not a reason to break somebody's link.
  const channel = await db.chatChannel.update({
    where: { id },
    data: {
      ...(name ? { name } : {}),
      ...(body.topic !== undefined ? { topic: cleanName(body.topic, CHAT_TOPIC_MAX) } : {}),
      ...(body.minRole === "AGENT" || body.minRole === "MANAGER" || body.minRole === "ADMIN"
        ? { minRole: body.minRole }
        : {}),
      ...(body.categoryId !== undefined ? { categoryId: body.categoryId || null } : {}),
      // Switching audience mode always replaces the member set wholesale —
      // simpler and safer than diffing which rows to add/remove.
      ...(body.restricted !== undefined
        ? {
            restricted: body.restricted,
            members: {
              deleteMany: {},
              ...(body.restricted ? { create: memberIds.map((userId) => ({ userId })) } : {}),
            },
          }
        : {}),
    },
  });

  return NextResponse.json({ channel });
}

/**
 * Archive a channel.
 *
 * Not a row delete: the messages are the agency's record of what was said, and
 * an admin tidying the rail should not be able to destroy that with one click.
 * Archived channels drop out of the rail and stay in the database.
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageChannels(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await db.chatChannel.update({ where: { id }, data: { archived: true } });
  return NextResponse.json({ ok: true });
}
