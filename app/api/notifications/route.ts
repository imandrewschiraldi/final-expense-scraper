import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cursor = req.nextUrl.searchParams.get("cursor");
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit")) || 20, 50);

  const notifications = await db.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = notifications.length > limit;
  return NextResponse.json({
    notifications: notifications.slice(0, limit),
    nextCursor: hasMore ? notifications[limit - 1].id : null,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id } = body as { id?: string };

  await db.notification.updateMany({
    where: { userId: session.user.id, ...(id ? { id } : {}) },
    data: { read: true },
  });

  return NextResponse.json({ ok: true });
}
