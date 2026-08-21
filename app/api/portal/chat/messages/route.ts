import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { CHAT_PAGE_SIZE, canSeeChannel, normaliseMessage } from "@/lib/chat";

export const dynamic = "force-dynamic";

/** Everything the client renders for one message. */
const MESSAGE_SELECT = {
  id: true,
  authorId: true,
  authorName: true,
  body: true,
  createdAt: true,
  editedAt: true,
  pinnedAt: true,
  reactions: { select: { emoji: true, userId: true } },
} as const;

type Row = {
  reactions: { emoji: string; userId: string }[];
} & Record<string, unknown>;

/**
 * Collapse per-person reaction rows into one entry per emoji.
 *
 * The client needs the count and whether *you* are in it — a bare tally can
 * give the first but never the second.
 */
function shape(rows: Row[], me: string) {
  return rows.map(({ reactions, ...rest }) => {
    const byEmoji = new Map<string, { emoji: string; count: number; mine: boolean }>();
    for (const r of reactions) {
      const entry = byEmoji.get(r.emoji) ?? { emoji: r.emoji, count: 0, mine: false };
      entry.count += 1;
      entry.mine ||= r.userId === me;
      byEmoji.set(r.emoji, entry);
    }
    return { ...rest, reactions: [...byEmoji.values()] };
  });
}

async function openChannel(channelId: string | null, role: "ADMIN" | "MANAGER" | "AGENT") {
  if (!channelId) return null;
  const channel = await db.chatChannel.findUnique({ where: { id: channelId } });
  if (!channel || channel.archived || !canSeeChannel(role, channel.minRole)) return null;
  return channel;
}

/**
 * Messages in a channel.
 *
 * Three modes:
 *  - `pinned=1`: the pinned list, newest pin first.
 *  - no `after`: the opening page, newest CHAT_PAGE_SIZE, oldest-first.
 *  - `after=<iso>`: only what has arrived since — on a quiet channel that is
 *    an index scan returning nothing, which is what makes polling cheap.
 *
 * The incremental pass also returns `touched`: ids of older messages whose
 * reactions or pin state changed. A reaction does not move `createdAt`, so
 * without this an emoji added to yesterday's message would never appear.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const channel = await openChannel(req.nextUrl.searchParams.get("channelId"), session.user.role);
  if (!channel) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (req.nextUrl.searchParams.get("pinned")) {
    const pins = await db.chatMessage.findMany({
      where: { channelId: channel.id, deletedAt: null, pinnedAt: { not: null } },
      orderBy: { pinnedAt: "desc" },
      take: 50,
      select: MESSAGE_SELECT,
    });
    return NextResponse.json({ messages: shape(pins as unknown as Row[], session.user.id) });
  }

  const after = req.nextUrl.searchParams.get("after");
  const afterDate = after ? new Date(after) : null;
  const incremental = Boolean(afterDate && !Number.isNaN(afterDate.getTime()));

  const rows = await db.chatMessage.findMany({
    where: {
      channelId: channel.id,
      deletedAt: null,
      ...(incremental ? { createdAt: { gt: afterDate! } } : {}),
    },
    orderBy: { createdAt: incremental ? "asc" : "desc" },
    take: incremental ? 200 : CHAT_PAGE_SIZE,
    select: MESSAGE_SELECT,
  });

  const ordered = incremental ? rows : rows.reverse();

  // Re-read the visible window's reactions and pins so late edits to older
  // messages land. Bounded to the page size, so it stays one indexed lookup.
  let touched: unknown[] = [];
  if (incremental) {
    const recent = await db.chatMessage.findMany({
      where: { channelId: channel.id, deletedAt: null, createdAt: { lte: afterDate! } },
      orderBy: { createdAt: "desc" },
      take: CHAT_PAGE_SIZE,
      select: MESSAGE_SELECT,
    });
    touched = shape(recent as unknown as Row[], session.user.id);
  }

  if (!incremental || ordered.length > 0) {
    const at = ordered.at(-1)?.createdAt ?? new Date();
    await db.chatRead.upsert({
      where: { channelId_userId: { channelId: channel.id, userId: session.user.id } },
      update: { lastReadAt: at },
      create: { channelId: channel.id, userId: session.user.id, lastReadAt: at },
    });
  }

  return NextResponse.json({
    messages: shape(ordered as unknown as Row[], session.user.id),
    touched,
    me: session.user.id,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { channelId?: string; body?: string };
  const channel = await openChannel(body.channelId ?? null, session.user.role);
  if (!channel) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const text = normaliseMessage(body.body);
  if (!text) return NextResponse.json({ error: "Message is empty" }, { status: 400 });

  const message = await db.chatMessage.create({
    data: {
      channelId: channel.id,
      authorId: session.user.id,
      authorName: session.user.name ?? session.user.email ?? "Agent",
      body: text,
    },
    select: MESSAGE_SELECT,
  });

  await db.chatRead.upsert({
    where: { channelId_userId: { channelId: channel.id, userId: session.user.id } },
    update: { lastReadAt: message.createdAt },
    create: { channelId: channel.id, userId: session.user.id, lastReadAt: message.createdAt },
  });

  return NextResponse.json({ message: shape([message as unknown as Row], session.user.id)[0] });
}

/** Authors retract their own; admins can retract anyone's. */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const message = await db.chatMessage.findUnique({ where: { id }, select: { authorId: true } });
  if (!message) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (message.authorId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Soft delete: the row stays so the surrounding conversation still reads in
  // order, and so an agency can answer "what was said" if it is ever asked.
  await db.chatMessage.update({
    where: { id },
    data: { deletedAt: new Date(), pinnedAt: null, pinnedById: null },
  });
  return NextResponse.json({ ok: true });
}
