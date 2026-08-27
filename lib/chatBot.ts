import { db } from "@/lib/db";
import { channelSlug } from "@/lib/chat";

/**
 * System-posted Team Chat messages — currently just the Daily Sales feed.
 *
 * Kept out of lib/chat.ts (imported by the client component ChatRoom.tsx)
 * so the Prisma client never ends up in a browser bundle, same reason
 * lib/chatAccess.ts is split out.
 */

const DAILY_SALES_CHANNEL_NAME = "Daily Sales";
const DAILY_SALES_CHANNEL_SLUG = channelSlug(DAILY_SALES_CHANNEL_NAME);
const BOT_NAME = "Sales Bot";

/**
 * Announces a closed policy in #daily-sales. Creates the channel the first
 * time this fires so admins don't have to pre-create it for the feature to
 * work — but if an admin has since archived it, that's respected instead of
 * silently resurrecting a channel they deliberately removed.
 *
 * Best-effort: failures here are logged, never thrown, so a chat outage can
 * never block someone from submitting a policy.
 */
export async function postDailySaleAnnouncement({
  agentName,
  annualPremium,
  carrier,
}: {
  agentName: string;
  annualPremium: number;
  carrier: string;
}) {
  try {
    const channel = await db.chatChannel.upsert({
      where: { slug: DAILY_SALES_CHANNEL_SLUG },
      update: {},
      create: { slug: DAILY_SALES_CHANNEL_SLUG, name: DAILY_SALES_CHANNEL_NAME, minRole: "AGENT" },
    });
    if (channel.archived) return;

    const amount = Math.round(annualPremium).toLocaleString();
    await db.chatMessage.create({
      data: {
        channelId: channel.id,
        authorId: null,
        authorName: BOT_NAME,
        body: `🎉 ${agentName} closed a $${amount} AP policy with ${carrier}!`,
      },
    });
  } catch (err) {
    console.error("Failed to post Daily Sales announcement", err);
  }
}
