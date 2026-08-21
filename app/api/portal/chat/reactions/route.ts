import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isReaction } from "@/lib/chat";
import { openChannelFor } from "@/lib/chatAccess";

export const dynamic = "force-dynamic";

/**
 * Toggle one reaction.
 *
 * One endpoint rather than add/remove, because the button is a toggle: the
 * client says "I tapped 👍 on this" and the server works out which way. That
 * also makes a double-tap idempotent instead of an error.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messageId, emoji } = (await req.json()) as { messageId?: string; emoji?: string };
  if (!messageId || !isReaction(emoji)) {
    return NextResponse.json({ error: "Unknown reaction" }, { status: 400 });
  }

  // Reacting is posting, so it needs the same gate as posting: you must be
  // allowed in the channel the message lives in.
  const message = await db.chatMessage.findUnique({
    where: { id: messageId },
    select: { deletedAt: true, channelId: true },
  });
  if (!message || message.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const channel = await openChannelFor(message.channelId, session.user.id, session.user.role);
  if (!channel) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const key = { messageId_userId_emoji: { messageId, userId: session.user.id, emoji } };
  const existing = await db.chatReaction.findUnique({ where: key });

  if (existing) {
    await db.chatReaction.delete({ where: key });
    return NextResponse.json({ reacted: false });
  }

  await db.chatReaction.create({ data: { messageId, userId: session.user.id, emoji } });
  return NextResponse.json({ reacted: true });
}
