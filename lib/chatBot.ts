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
 * Finds the Daily Sales channel by slug first (the normal case — including
 * one an admin created by hand through the New Channel modal, since that
 * flow slugs "Daily Sales" the exact same way this file does), then falls
 * back to a case-insensitive name match in case its slug ever ends up
 * different from what we'd generate (a rename, an emoji prefix, etc.) — so
 * an admin's existing channel is always reused, never duplicated. Only
 * creates a new one if truly neither lookup finds it, so the feature still
 * works out of the box with no admin setup required.
 */
async function findOrCreateDailySalesChannel() {
  const bySlug = await db.chatChannel.findUnique({ where: { slug: DAILY_SALES_CHANNEL_SLUG } });
  if (bySlug) return bySlug;

  const byName = await db.chatChannel.findFirst({
    where: { name: { equals: DAILY_SALES_CHANNEL_NAME, mode: "insensitive" } },
  });
  if (byName) return byName;

  return db.chatChannel.create({
    data: { slug: DAILY_SALES_CHANNEL_SLUG, name: DAILY_SALES_CHANNEL_NAME, minRole: "AGENT" },
  });
}

/**
 * Announces a closed policy in Daily Sales — if an admin has since archived
 * it, that's respected instead of silently resurrecting a channel they
 * deliberately removed.
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
    const channel = await findOrCreateDailySalesChannel();
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
