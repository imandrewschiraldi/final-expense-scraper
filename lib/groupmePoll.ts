import { db } from "@/lib/db";
import { parseGroupMeCallback, type GroupMeCallback } from "@/lib/chat";
import { channelRecipientIds } from "@/lib/chatAccess";
import { sendPushToUser } from "@/lib/push";

/**
 * POLL-mode GroupMe bridge — reads a group's messages with a member's own
 * personal access token (GET .../groups/:id/messages) instead of a bot
 * callback. Exists for exactly one situation: nobody with rights to create
 * a bot on the GroupMe group (dev.groupme.com/bots/new, which also only
 * allows one registered callback URL per group, group-wide, not just
 * per-bot) is available to set up the WEBHOOK path. This file is
 * server-only — never imported by ChatRoom.tsx or any other client
 * component, since it both holds a real access token and talks to Prisma
 * directly, unlike lib/chat.ts.
 */

const GROUPME_API = "https://api.groupme.com/v3";

/** Don't actually hit GroupMe more than once per this many ms, no matter
 *  how often an open Team Chat tab polls our own messages endpoint, or how
 *  often the groupme-sync cron fires — GroupMe publishes no rate limit for
 *  this endpoint, so this is a deliberately conservative floor, not a
 *  documented requirement. Kept short (rather than matching the cron's own
 *  1-minute floor) so a channel someone actually has open stays close to
 *  real-time — this throttle is what caps the on-read trigger in
 *  messages/route.ts, not the cron, which already only runs once a
 *  minute. */
export const CHAT_GROUPME_POLL_MIN_INTERVAL_MS = 5_000;

export type GroupMeGroupOption = { id: string; name: string };

/** Every group the access token's owner belongs to, for the "pick a
 *  group" step of connecting — GroupMe has no concept of searching by
 *  name server-side, so this is the whole list (single page; an account
 *  in GroupMe's own apps rarely has more than a few dozen groups, and
 *  `per_page=100` covers that in one request). */
export async function fetchGroupMeGroups(
  accessToken: string,
): Promise<GroupMeGroupOption[]> {
  const res = await fetch(
    `${GROUPME_API}/groups?token=${encodeURIComponent(accessToken)}&per_page=100&omit=memberships`,
  );
  if (!res.ok) {
    throw new Error(
      res.status === 401
        ? "That access token was rejected by GroupMe."
        : `GroupMe returned ${res.status}.`,
    );
  }
  const data = (await res.json()) as {
    response?: { id?: unknown; name?: unknown }[];
  };
  const groups = Array.isArray(data.response) ? data.response : [];
  return groups
    .filter(
      (g): g is { id: string; name: string } =>
        typeof g.id === "string" && typeof g.name === "string",
    )
    .map((g) => ({ id: g.id, name: g.name }));
}

/** Validates a token/group pair up front (at connect time) so a typo'd
 *  token or a group the user isn't actually in surfaces immediately in
 *  the admin UI, rather than silently never syncing anything later. */
export async function verifyGroupMeAccess(
  accessToken: string,
  groupId: string,
): Promise<void> {
  const res = await fetch(
    `${GROUPME_API}/groups/${encodeURIComponent(groupId)}?token=${encodeURIComponent(accessToken)}`,
  );
  if (!res.ok) {
    throw new Error(
      res.status === 404
        ? "That GroupMe group wasn't found for this account."
        : `GroupMe returned ${res.status}.`,
    );
  }
}

/** New messages since `afterId`, always returned oldest-first — the order
 *  both the relay loop (so messages land with ascending createdAt, same
 *  order they were actually sent in) and the lastSyncedMessageId cursor
 *  (so it ends up pointing at the actual newest id, not whichever one
 *  happened to be processed last) depend on.
 *
 *  With `after_id` set, GroupMe already returns ascending order (its
 *  documented-safe pagination direction for polling — `since_id` can skip
 *  messages if more than 20 landed between polls, `after_id` cannot).
 *  Without it — `afterId` null means "first sync," GroupMe treats an
 *  absent cursor as "most recent page" rather than a newly connected
 *  bridge relaying a group's entire history — GroupMe's default listing
 *  is newest-first (the same convention this app's own non-incremental
 *  message poll follows, see messages/route.ts's own `rows.reverse()`),
 *  so that case is reversed here before returning.
 *
 *  A 304 means nothing new, not an error. */
async function fetchNewGroupMeMessages(
  accessToken: string,
  groupId: string,
  afterId: string | null,
): Promise<GroupMeCallback[]> {
  const params = new URLSearchParams({ token: accessToken, limit: "100" });
  if (afterId) params.set("after_id", afterId);
  const res = await fetch(
    `${GROUPME_API}/groups/${encodeURIComponent(groupId)}/messages?${params}`,
  );
  if (res.status === 304) return [];
  if (!res.ok) throw new Error(`GroupMe returned ${res.status}.`);
  const data = (await res.json()) as { response?: { messages?: unknown[] } };
  const messages = Array.isArray(data.response?.messages)
    ? (data.response.messages as GroupMeCallback[])
    : [];
  return afterId ? messages : messages.reverse();
}

type PollBridge = {
  id: string;
  channelId: string;
  accessToken: string | null;
  groupMeGroupId: string | null;
  lastSyncedMessageId: string | null;
  lastPolledAt: Date | null;
};

/**
 * Pulls and relays whatever's new for one POLL-mode bridge, throttled to
 * CHAT_GROUPME_POLL_MIN_INTERVAL_MS. Called inline from the chat messages
 * GET route right before it reads the channel back out — piggybacking on
 * whatever cadence a client's own Team Chat poll is already running at,
 * the same "no new infrastructure" approach the rest of this app's chat
 * takes (see lib/chat.ts's own module doc comment).
 *
 * Swallows its own errors (a bad/expired token, a GroupMe outage) rather
 * than failing the message list the viewer actually asked for — the
 * channel just doesn't get fresher GroupMe messages until the next
 * successful poll.
 */
export async function syncGroupMePollBridge(bridge: PollBridge): Promise<void> {
  if (!bridge.accessToken || !bridge.groupMeGroupId) return;
  if (
    bridge.lastPolledAt &&
    Date.now() - bridge.lastPolledAt.getTime() <
      CHAT_GROUPME_POLL_MIN_INTERVAL_MS
  )
    return;

  // Claimed immediately (before the network call) so two near-simultaneous
  // requests from two open tabs don't both decide the throttle window has
  // elapsed and double-poll GroupMe.
  await db.chatGroupMeBridge.update({
    where: { id: bridge.id },
    data: { lastPolledAt: new Date() },
  });

  let raw: GroupMeCallback[];
  try {
    raw = await fetchNewGroupMeMessages(
      bridge.accessToken,
      bridge.groupMeGroupId,
      bridge.lastSyncedMessageId,
    );
  } catch {
    return;
  }
  if (raw.length === 0) return;

  let newestId = bridge.lastSyncedMessageId;
  let relayedAny = false;

  for (const item of raw) {
    if (typeof item.id === "string") newestId = item.id;
    const parsed = parseGroupMeCallback(item);
    if (!parsed) continue;

    const created = await db.chatMessage
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
      .catch((err: unknown) => {
        const isDuplicate =
          typeof err === "object" &&
          err !== null &&
          "code" in err &&
          (err as { code?: unknown }).code === "P2002";
        if (!isDuplicate) throw err;
        return null;
      });

    if (created) {
      relayedAny = true;
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
  }

  await db.chatGroupMeBridge.update({
    where: { id: bridge.id },
    data: {
      lastSyncedMessageId: newestId,
      ...(relayedAny ? { lastMessageAt: new Date() } : {}),
    },
  });
}

/** Every POLL-mode bridge, synced in turn — called from the groupme-sync
 *  cron (app/api/cron/groupme-sync) so messages keep arriving (at the
 *  cron's own 1-minute floor, the fastest Vercel Cron supports) even when
 *  nobody has the channel open to trigger the faster on-read sync in
 *  messages/route.ts. Sequential rather than Promise.all — there's no
 *  reason to burst multiple bridges' requests at GroupMe at once, and
 *  this agency-scale deployment typically has only one or two bridges
 *  anyway. */
export async function syncAllGroupMePollBridges(): Promise<void> {
  const bridges = await db.chatGroupMeBridge.findMany({
    where: {
      mode: "POLL",
      accessToken: { not: null },
      groupMeGroupId: { not: null },
    },
  });
  for (const bridge of bridges) {
    await syncGroupMePollBridge(bridge);
  }
}
