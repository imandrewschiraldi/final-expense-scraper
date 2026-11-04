import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseGroupMeCallback, type GroupMeCallback } from "@/lib/chat";
import { channelRecipientIds } from "@/lib/chatAccess";
import { sendPushToUser } from "@/lib/push";

export const dynamic = "force-dynamic";

/**
 * GroupMe's bot callback. One-way: GroupMe posts land as chat messages
 * here, nothing from this app is ever posted back.
 *
 * No request signing exists on GroupMe's side (unlike most webhook
 * providers), so `[token]` — an unguessable id, never the channel's own
 * id — is the entire authorization check. Whoever creates the bot on
 * dev.groupme.com pastes this URL in as its callback and GroupMe does the
 * rest; nothing on our side needs their GroupMe credentials.
 *
 * Always resolves 200 once the token is valid, even for a skipped payload
 * (a system post, a duplicate delivery) — GroupMe treats a non-2xx as
 * delivery failure and keeps retrying, which would just re-send the exact
 * payload we already decided to ignore.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const bridge = await db.chatGroupMeBridge.findUnique({
    where: { webhookToken: token },
  });
  if (!bridge)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const payload = (await req
    .json()
    .catch(() => null)) as GroupMeCallback | null;
  if (!payload) return NextResponse.json({ ok: true });

  const parsed = parseGroupMeCallback(payload);
  if (!parsed) return NextResponse.json({ ok: true });

  const message = await db.chatMessage
    .create({
      data: {
        channelId: bridge.channelId,
        authorId: null,
        authorName: parsed.authorName,
        body: parsed.body,
        imageUrl: parsed.imageUrl,
        externalId: parsed.externalId,
        externalAvatarUrl: parsed.avatarUrl,
      },
    })
    // A retried delivery hits the (channelId, externalId) unique index —
    // swallow that one case rather than erroring, since GroupMe will just
    // retry again on a non-2xx and loop forever.
    .catch((err: unknown) => {
      const isDuplicate =
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code?: unknown }).code === "P2002";
      if (!isDuplicate) throw err;
      return null;
    });

  await db.chatGroupMeBridge.update({
    where: { id: bridge.id },
    data: {
      lastMessageAt: new Date(),
      groupMeGroupId: bridge.groupMeGroupId ?? parsed.groupId ?? undefined,
    },
  });

  if (message) {
    const channel = await db.chatChannel.findUnique({
      where: { id: bridge.channelId },
      select: { id: true, name: true, restricted: true, minRole: true },
    });
    if (channel) {
      const recipients = await channelRecipientIds(channel);
      const preview = parsed.body
        ? parsed.body.length > 120
          ? `${parsed.body.slice(0, 117)}...`
          : parsed.body
        : "Sent a photo";
      await Promise.all(
        recipients.map((userId) =>
          sendPushToUser(userId, {
            title: `#${channel.name}`,
            body: `${parsed.authorName}: ${preview}`,
            url: "/chat",
          }),
        ),
      );
    }
  }

  return NextResponse.json({ ok: true });
}
