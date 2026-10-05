import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/** Whether the current user has at least one push subscription saved. */
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const count = await db.pushSubscription.count({ where: { userId: session.user.id } });
  return NextResponse.json({ subscribed: count > 0 });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { endpoint, keys } = body as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  await db.pushSubscription.upsert({
    where: { endpoint },
    update: { userId: session.user.id, p256dh: keys.p256dh, auth: keys.auth },
    create: { userId: session.user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { endpoint } = (await req.json().catch(() => ({}))) as { endpoint?: string };

  await db.pushSubscription.deleteMany({
    where: endpoint ? { userId: session.user.id, endpoint } : { userId: session.user.id },
  });

  return NextResponse.json({ ok: true });
}
