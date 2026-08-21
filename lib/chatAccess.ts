import { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { canManageChannels, canSeeChannel } from "@/lib/chat";

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
