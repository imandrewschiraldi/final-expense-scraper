import { NextRequest, NextResponse } from "next/server";
import { syncAllGroupMePollBridges } from "@/lib/groupmePoll";

export const dynamic = "force-dynamic";

/** Runs every minute (vercel.json — Vercel Cron's own floor, not a choice
 *  made here) so a POLL-mode GroupMe bridge keeps receiving messages even
 *  when nobody has its channel open in Team Chat. Each bridge's own
 *  CHAT_GROUPME_POLL_MIN_INTERVAL_MS throttle still applies underneath
 *  this — if someone's actively viewing the channel, the faster on-read
 *  sync in messages/route.ts has usually already covered this bridge
 *  recently, and this run is a no-op for it. */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await syncAllGroupMePollBridges();
  return NextResponse.json({ ok: true });
}
