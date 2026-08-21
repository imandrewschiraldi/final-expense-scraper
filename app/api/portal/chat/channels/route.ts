import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  CHAT_TOPIC_MAX,
  canManageChannels,
  channelSlug,
  cleanName,
  visibleChannelRoles,
} from "@/lib/chat";

export const dynamic = "force-dynamic";

/**
 * The rail: categories, the channels inside them, and an unread flag each.
 *
 * Unread is derived from "a message newer than my read marker" rather than a
 * stored counter, so it cannot drift out of step with the messages table.
 */
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [categories, channels] = await Promise.all([
    db.chatCategory.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }] }),
    db.chatChannel.findMany({
      where: { archived: false, minRole: { in: visibleChannelRoles(session.user.role) } },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      include: {
        reads: { where: { userId: session.user.id }, select: { lastReadAt: true } },
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
      },
    }),
  ]);

  return NextResponse.json({
    canManage: canManageChannels(session.user.role),
    categories: categories.map((c) => ({ id: c.id, name: c.name })),
    channels: channels.map((c) => {
      const latest = c.messages[0]?.createdAt ?? null;
      const lastRead = c.reads[0]?.lastReadAt ?? null;
      return {
        id: c.id,
        slug: c.slug,
        name: c.name,
        topic: c.topic,
        minRole: c.minRole,
        categoryId: c.categoryId,
        unread: Boolean(latest && (!lastRead || latest > lastRead)),
      };
    }),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageChannels(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as {
    name?: string;
    topic?: string;
    minRole?: string;
    categoryId?: string | null;
  };

  const name = cleanName(body.name);
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const slug = channelSlug(name);
  if (!slug) return NextResponse.json({ error: "Name needs a letter or number" }, { status: 400 });
  if (await db.chatChannel.findUnique({ where: { slug } })) {
    return NextResponse.json({ error: "A channel with that name already exists" }, { status: 409 });
  }

  const last = await db.chatChannel.findFirst({ orderBy: { order: "desc" }, select: { order: true } });

  const channel = await db.chatChannel.create({
    data: {
      slug,
      name,
      topic: cleanName(body.topic, CHAT_TOPIC_MAX),
      minRole: body.minRole === "MANAGER" || body.minRole === "ADMIN" ? body.minRole : "AGENT",
      categoryId: body.categoryId || null,
      order: (last?.order ?? 0) + 1,
    },
  });

  return NextResponse.json({ channel });
}
