import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { verifyGroupMeAccess } from "@/lib/groupmePoll";
import type { ChatGroupMeBridgeMode } from "@prisma/client";

function webhookUrlFor(token: string) {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return `${baseUrl}/api/webhooks/groupme/${token}`;
}

// accessToken is deliberately never included — a live GroupMe credential,
// readable only server-side. The admin UI only ever learns whether one is
// set (hasAccessToken), never its value, including right after the admin
// who typed it hits Connect.
function shape(bridge: {
  mode: ChatGroupMeBridgeMode;
  webhookToken: string;
  groupMeGroupId: string | null;
  accessToken: string | null;
  lastMessageAt: Date | null;
  createdAt: Date;
}) {
  return {
    mode: bridge.mode,
    webhookUrl: webhookUrlFor(bridge.webhookToken),
    groupMeGroupId: bridge.groupMeGroupId,
    hasAccessToken: Boolean(bridge.accessToken),
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

type ConnectBody = {
  channelId?: string;
  mode?: string;
  accessToken?: string;
  groupMeGroupId?: string;
};

/**
 * Connect a channel, in one of two modes:
 *  - WEBHOOK (default when `mode` is omitted): idempotent — calling again
 *    for an already-connected channel just returns the existing webhook
 *    URL rather than minting a second token.
 *  - POLL: requires `accessToken` and `groupMeGroupId` up front, verified
 *    against GroupMe before saving (verifyGroupMeAccess) so a typo'd
 *    token or a group the token's owner isn't actually in surfaces
 *    immediately here instead of just never syncing anything later.
 *    Re-connecting in POLL mode always overwrites the stored token — the
 *    common case is rotating to someone else's token once the original
 *    person's token expires or they leave the group.
 */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const body = (await req.json().catch(() => null)) as ConnectBody | null;
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

  if (body?.mode === "POLL") {
    const accessToken = body.accessToken?.trim();
    const groupMeGroupId = body.groupMeGroupId?.trim();
    if (!accessToken || !groupMeGroupId) {
      return NextResponse.json(
        { error: "accessToken and groupMeGroupId are required" },
        { status: 400 },
      );
    }

    try {
      await verifyGroupMeAccess(accessToken, groupMeGroupId);
    } catch (err) {
      return NextResponse.json(
        {
          error:
            err instanceof Error ? err.message : "Could not verify that group.",
        },
        { status: 400 },
      );
    }

    const bridge = await db.chatGroupMeBridge.upsert({
      where: { channelId },
      // Switching an existing bridge from WEBHOOK to POLL (or reconnecting
      // POLL with a fresh token) starts the cursor over — the newly
      // provided token has never synced anything yet.
      update: {
        mode: "POLL",
        accessToken,
        groupMeGroupId,
        lastSyncedMessageId: null,
        lastPolledAt: null,
      },
      create: {
        channelId,
        mode: "POLL",
        accessToken,
        groupMeGroupId,
        createdById: guard.session.user.id,
      },
    });
    return NextResponse.json({ bridge: shape(bridge) });
  }

  const bridge = await db.chatGroupMeBridge.upsert({
    where: { channelId },
    update: {},
    create: { channelId, mode: "WEBHOOK", createdById: guard.session.user.id },
  });
  return NextResponse.json({ bridge: shape(bridge) });
}

/** Disconnect. In WEBHOOK mode the callback URL stops working immediately
 *  (GroupMe will just see 404s and, per its own retry policy, eventually
 *  give up); in POLL mode the stored access token is deleted along with
 *  the bridge row, so nothing lingers once disconnected. */
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
