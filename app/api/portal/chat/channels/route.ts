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

  const manage = canManageChannels(session.user.role);

  const [categories, channels] = await Promise.all([
    db.chatCategory.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }] }),
    db.chatChannel.findMany({
      where: manage
        ? { archived: false }
        : {
            archived: false,
            OR: [
              { restricted: false, minRole: { in: visibleChannelRoles(session.user.role) } },
              { restricted: true, members: { some: { userId: session.user.id } } },
            ],
          },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      include: {
        reads: { where: { userId: session.user.id }, select: { lastReadAt: true } },
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
        // Only admins need to know exactly who's on a restricted channel —
        // that's their editing UI. Small join either way, but no reason to
        // ship membership lists to clients that won't use them.
        members: manage ? { select: { userId: true } } : false,
      },
    }),
  ]);

  return NextResponse.json({
    canManage: manage,
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
        restricted: c.restricted,
        memberIds: manage ? (c.members ?? []).map((m) => m.userId) : undefined,
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
    restricted?: boolean;
    memberIds?: string[];
  };

  const name = cleanName(body.name);
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const slug = channelSlug(name);
  if (!slug) return NextResponse.json({ error: "Name needs a letter or number" }, { status: 400 });
  if (await db.chatChannel.findUnique({ where: { slug } })) {
    return NextResponse.json({ error: "A channel with that name already exists" }, { status: 409 });
  }

  const restricted = body.restricted === true;
  const memberIds = [...new Set((body.memberIds ?? []).filter((id): id is string => typeof id === "string"))];
  if (restricted && memberIds.length === 0) {
    return NextResponse.json({ error: "Select at least one person" }, { status: 400 });
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
      restricted,
      members: restricted ? { create: memberIds.map((userId) => ({ userId })) } : undefined,
    },
  });

  return NextResponse.json({ channel });
}
