import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageChannels, cleanName } from "@/lib/chat";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageChannels(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const name = cleanName(((await req.json()) as { name?: string }).name);
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const last = await db.chatCategory.findFirst({ orderBy: { order: "desc" }, select: { order: true } });
  const category = await db.chatCategory.create({ data: { name, order: (last?.order ?? 0) + 1 } });
  return NextResponse.json({ category });
}
