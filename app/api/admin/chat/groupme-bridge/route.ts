import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";

function webhookUrlFor(token: string) {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return `${baseUrl}/api/webhooks/groupme/${token}`;
}

function shape(bridge: {
  webhookToken: string;
  groupMeGroupId: string | null;
  lastMessageAt: Date | null;
  createdAt: Date;
}) {
  return {
    webhookUrl: webhookUrlFor(bridge.webhookToken),
    groupMeGroupId: bridge.groupMeGroupId,
    lastMessageAt: bridge.lastMessageAt,
    createdAt: bridge.createdAt,
  };
}

/** Current bridge for a channel, or null if it isn't connected. */
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const channelId = req.nextUrl.searchParams.get("channelId");
  if (!channelId)
    return NextResponse.json(
      { error: "channelId is required" },
      { status: 400 },
    );

  const bridge = await db.chatGroupMeBridge.findUnique({
    where: { channelId },
  });
  return NextResponse.json({ bridge: bridge ? shape(bridge) : null });
}

/** Connect a channel — idempotent: calling this again for an
 *  already-connected channel just returns its existing webhook URL rather
 *  than minting a second token for the same channel. */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const body = (await req.json().catch(() => null)) as {
    channelId?: string;
  } | null;
  const channelId = body?.channelId;
  if (!channelId)
    return NextResponse.json(
      { error: "channelId is required" },
      { status: 400 },
    );

  const channel = await db.chatChannel.findUnique({
    where: { id: channelId },
    select: { id: true },
  });
  if (!channel)
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });

  const bridge = await db.chatGroupMeBridge.upsert({
    where: { channelId },
    update: {},
    create: { channelId, createdById: guard.session.user.id },
  });

  return NextResponse.json({ bridge: shape(bridge) });
}

/** Disconnect — the webhook URL stops working immediately (GroupMe will
 *  just see 404s and, per its own retry policy, eventually give up). */
export async function DELETE(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const channelId = req.nextUrl.searchParams.get("channelId");
  if (!channelId)
    return NextResponse.json(
      { error: "channelId is required" },
      { status: 400 },
    );

  await db.chatGroupMeBridge.deleteMany({ where: { channelId } });
  return NextResponse.json({ ok: true });
}
