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
  const body = raw.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
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
export const CHAT_REACTIONS = ["👍", "🔥", "🎉", "💰", "👀", "✅", "😂", "❤️"] as const;

export type ChatReactionEmoji = (typeof CHAT_REACTIONS)[number];

/** Server-side guard: only emoji from the palette are ever stored. */
export function isReaction(value: unknown): value is ChatReactionEmoji {
  return typeof value === "string" && (CHAT_REACTIONS as readonly string[]).includes(value);
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
