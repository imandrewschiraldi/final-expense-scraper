import { Role } from "@prisma/client";

/**
 * Team chat, in one place.
 *
 * The transport is polling, not sockets. A Vercel function cannot hold a
 * long-lived connection open, and every other live surface here — dashboard,
 * leaderboard, notification bell — already polls. Adding a socket service
 * would mean a second account and a second bill per agency deployment, which
 * is the thing this platform's architecture exists to avoid.
 */

/** How often an open, focused tab asks for new messages. */
export const CHAT_POLL_ACTIVE_MS = 3_000;

/**
 * ...and how often a backgrounded tab does. A room left open on a second
 * monitor all day is the common case, so the hidden interval is what actually
 * determines the load an agency puts on its own database.
 */
export const CHAT_POLL_HIDDEN_MS = 30_000;

/** Longest a single message may be. Long enough for a paragraph, short enough
 *  that nobody pastes a policy application into the channel. */
export const CHAT_MESSAGE_MAX = 4_000;

/** How many messages a channel opens with, and pages by. */
export const CHAT_PAGE_SIZE = 60;

/** Largest image a message may attach. Vercel Blob has no practical limit
 *  itself — this is about keeping an agent's phone upload fast, not storage. */
export const CHAT_IMAGE_MAX_BYTES = 8 * 1024 * 1024;

/** Accepted image types, shared between the file picker and the upload route. */
export const CHAT_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
] as const;

/**
 * Admin and system (Sales Bot) posts speak for the agency, not a person —
 * shown with a fixed company mark instead of whichever personal photo the
 * admin account happens to have set, everywhere a chat message's author
 * picture is rendered (the full Team Chat page, the Overview widget).
 * Each one always uses the same mark regardless of the viewer's own
 * light/dark theme — admin the black-background mark, Sales Bot the neon
 * mark on white.
 */
export const ADMIN_MARK_URL = "/tier1-mark-admin-dark.png";
export const BOT_MARK_URL = "/tier1-mark-bot.png";

/** The flat background color one of the marks above is drawn on (each is
 *  a baked, non-transparent image — not a cutout — so the avatar circle's
 *  fill needs to match it exactly or the corners show a mismatched seam).
 *  Returns null for an ordinary personal photo URL or no photo at all. */
export function markBackground(url: string | null): string | null {
  if (url === BOT_MARK_URL) return "#ffffff";
  if (url === ADMIN_MARK_URL) return "#000000";
  return null;
}

/** Two-letter initials (first + last name) for a photo-less sender's
 *  avatar circle — in both the full Team Chat page and the Overview
 *  widget, same as the Arena leaderboard's own avatar badges. A one-word
 *  name (just "Miles", a GroupMe member who never set a last name) falls
 *  back to its single initial rather than repeating or erroring. */
export function chatInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Roles that can read a channel gated at `minRole`.
 *
 * Ranked rather than exact-matched: a channel for managers is also visible to
 * admins, because an admin who cannot see the manager room would have to keep
 * a second account to do their job.
 */
const RANK: Record<Role, number> = { AGENT: 0, MANAGER: 1, ADMIN: 2 };

export function canSeeChannel(role: Role, minRole: Role): boolean {
  return RANK[role] >= RANK[minRole];
}

/** Channels this role may read, as a Prisma `where` fragment. */
export function visibleChannelRoles(role: Role): Role[] {
  return (Object.keys(RANK) as Role[]).filter((r) => canSeeChannel(role, r));
}

/** Only admins shape the channel list; everyone else just talks. */
export function canManageChannels(role: Role): boolean {
  return role === "ADMIN";
}

/**
 * Normalise a submitted message.
 *
 * Returns null for anything that is only whitespace, so an accidental Enter
 * cannot post an empty row. Trailing blank lines are trimmed but interior
 * ones are kept — people use them deliberately.
 */
export function normaliseMessage(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const body = raw
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!body) return null;
  return body.slice(0, CHAT_MESSAGE_MAX);
}

/** URL-safe channel slug from a display name. */
export function channelSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/**
 * The reaction palette.
 *
 * A fixed set rather than a full emoji keyboard: on a sales floor the useful
 * reactions are acknowledgement and applause, and a short row people can hit
 * without thinking beats a picker they have to search. Any of these is one
 * tap; nothing else is offered.
 */
export const CHAT_REACTIONS = [
  "👍",
  "🔥",
  "🎉",
  "💰",
  "👀",
  "✅",
  "😂",
  "❤️",
] as const;

export type ChatReactionEmoji = (typeof CHAT_REACTIONS)[number];

/** Server-side guard: only emoji from the palette are ever stored. */
export function isReaction(value: unknown): value is ChatReactionEmoji {
  return (
    typeof value === "string" &&
    (CHAT_REACTIONS as readonly string[]).includes(value)
  );
}

/** Longest a channel or category name may be. */
export const CHAT_NAME_MAX = 60;
export const CHAT_TOPIC_MAX = 200;

/** Trim a name to something storable, or null if it is empty. */
export function cleanName(raw: unknown, max = CHAT_NAME_MAX): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.replace(/\s+/g, " ").trim().slice(0, max);
  return name || null;
}

/**
 * GroupMe bridge — one-way only (GroupMe → this channel). GroupMe's bot
 * callback payload, reduced to what a relayed message actually needs.
 * https://dev.groupme.com/tutorials/bots
 */
export type GroupMeCallback = {
  id?: unknown;
  group_id?: unknown;
  name?: unknown;
  text?: unknown;
  avatar_url?: unknown;
  sender_type?: unknown;
  system?: unknown;
  attachments?: unknown;
};

export type GroupMeParsed = {
  externalId: string;
  groupId: string | null;
  authorName: string;
  body: string;
  imageUrl: string | null;
  avatarUrl: string | null;
};

/**
 * Shapes one GroupMe callback into a chat message, or null to skip it.
 *
 * Skipped: anything without a real GroupMe message id (nothing to key
 * idempotency on), GroupMe's own join/leave/name-change system posts
 * (`sender_type: "system"` or the `system: true` flag), and posts from
 * another bot in the same group (`sender_type: "bot"`) — only real people
 * talking gets relayed in.
 */
export function parseGroupMeCallback(
  payload: GroupMeCallback,
): GroupMeParsed | null {
  if (typeof payload.id !== "string" || !payload.id) return null;
  if (payload.system === true) return null;
  if (payload.sender_type === "system" || payload.sender_type === "bot")
    return null;

  const text =
    typeof payload.text === "string"
      ? payload.text.trim().slice(0, CHAT_MESSAGE_MAX)
      : "";

  let imageUrl: string | null = null;
  if (Array.isArray(payload.attachments)) {
    const image = payload.attachments.find(
      (a): a is { type: string; url: string } =>
        typeof a === "object" &&
        a !== null &&
        (a as { type?: unknown }).type === "image" &&
        typeof (a as { url?: unknown }).url === "string",
    );
    if (image) imageUrl = image.url;
  }

  if (!text && !imageUrl) return null;

  return {
    externalId: payload.id,
    groupId: typeof payload.group_id === "string" ? payload.group_id : null,
    authorName:
      typeof payload.name === "string" && payload.name.trim()
        ? payload.name.trim().slice(0, 120)
        : "GroupMe",
    body: text,
    imageUrl,
    avatarUrl:
      typeof payload.avatar_url === "string" ? payload.avatar_url : null,
  };
}
