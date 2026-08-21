import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageChannels } from "@/lib/chat";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Pinning is an admin act.
 *
 * A pin is the agency saying "this is the answer" — the carrier bulletin, the
 * comp change, the rule. If anyone could pin, the pinned list would become a
 * second unread feed rather than the short authoritative one it is for.
 */
export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageChannels(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await db.chatMessage.update({
    where: { id },
    data: { pinnedAt: new Date(), pinnedById: session.user.id },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageChannels(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await db.chatMessage.update({ where: { id }, data: { pinnedAt: null, pinnedById: null } });
  return NextResponse.json({ ok: true });
}
