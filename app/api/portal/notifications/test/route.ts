import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendPushToUser } from "@/lib/push";

/**
 * Self-test: creates a real Notification row for the current user (so the
 * in-app toast + bell badge fire on the next poll) and attempts a real push
 * to every device they've subscribed on. Reuses LEADS_ASSIGNED rather than
 * adding a dedicated TEST notification type/migration, since the point is
 * exercising the exact same pipeline a real one goes through — the payload
 * is clearly fake ({ count: 1, test: true }) so it's recognizable as a test
 * if anyone ever looks at the raw row.
 *
 * The push half is a no-op (not an error) if this device/account hasn't
 * subscribed yet, or if the push_subscriptions table hasn't reached this
 * database yet — see lib/push.ts.
 */
export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await db.notification.create({
    data: {
      userId: session.user.id,
      type: "LEADS_ASSIGNED",
      payload: { count: 1, test: true },
    },
  });

  await sendPushToUser(session.user.id, {
    title: "Test Notification",
    body: "If you can see this, push notifications are working on this device.",
    url: "/portal/dashboard",
  });

  return NextResponse.json({ ok: true });
}
