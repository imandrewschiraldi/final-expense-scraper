import { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { canManageChannels, canSeeChannel } from "@/lib/chat";

const ALL_ROLES: Role[] = ["AGENT", "MANAGER", "ADMIN"];

/**
 * Resolve a channel for a request and confirm this user may actually see it.
 *
 * A channel is gated one of two ways, never both: the `minRole` tier (the
 * default), or an explicit `restricted` member list. Admins always pass —
 * an admin who created a restricted room should never lock themselves out
 * of managing it. Centralised here so the messages and reactions routes
 * can't drift apart on what "allowed in this channel" means.
 *
 * Kept out of lib/chat.ts (which ChatRoom.tsx, a client component, imports
 * for its shared constants) so the Prisma client never ends up in a browser
 * bundle — this file is server-only, imported by API routes alone.
 */
export async function openChannelFor(channelId: string | null, userId: string, role: Role) {
  if (!channelId) return null;
  const channel = await db.chatChannel.findUnique({ where: { id: channelId } });
  if (!channel || channel.archived) return null;
  if (canManageChannels(role)) return channel;

  if (channel.restricted) {
    const member = await db.chatChannelMember.findUnique({
      where: { channelId_userId: { channelId: channel.id, userId } },
    });
    return member ? channel : null;
  }

  return canSeeChannel(role, channel.minRole) ? channel : null;
}

/**
 * Every userId who can see a channel — mirrors openChannelFor's own rules
 * (restricted: the explicit member list plus admins; otherwise: every role
 * at or above minRole) so a push notification only ever reaches someone who
 * could actually open the channel.
 */
export async function channelRecipientIds(channel: { id: string; restricted: boolean; minRole: Role }) {
  if (channel.restricted) {
    const [members, admins] = await Promise.all([
      db.chatChannelMember.findMany({ where: { channelId: channel.id }, select: { userId: true } }),
      db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } }),
    ]);
    return [...new Set([...members.map((m) => m.userId), ...admins.map((a) => a.id)])];
  }

  const qualifyingRoles = ALL_ROLES.filter((r) => canSeeChannel(r, channel.minRole));
  const users = await db.user.findMany({ where: { role: { in: qualifyingRoles } }, select: { id: true } });
  return users.map((u) => u.id);
}
