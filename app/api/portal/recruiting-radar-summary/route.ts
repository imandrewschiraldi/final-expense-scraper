import { NextResponse } from "next/server";
import { requireRecruitingRadarAccess } from "@/lib/apiAuth";
import { db } from "@/lib/db";

const WINDOW_DAYS = 7;
const RECENT_COUNT = 5;

/** A lightweight 7-day summary for the Overview page's Recruiting Radar
 *  tile — a status-change count by day, not the full prospect list the
 *  admin panel loads (every prospect, full history, no pagination). Access
 *  is the same per-user gate as the full feature: an account without it
 *  gets a 403, and the widget itself renders nothing rather than erroring,
 *  so Recruiting Radar can be enabled in the Overview layout agency-wide
 *  while only actually showing up for accounts that can use it. */
export async function GET() {
  const guard = await requireRecruitingRadarAccess();
  if ("error" in guard) return guard.error;

  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [transitions, recent] = await Promise.all([
    db.recruitStatusHistory.findMany({
      where: { createdAt: { gte: since } },
      select: { toStatus: true },
    }),
    db.recruitStatusHistory.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: RECENT_COUNT,
      select: { id: true, toStatus: true, createdAt: true, prospect: { select: { name: true } } },
    }),
  ]);

  const counts: Record<string, number> = { NEW: 0, DMD: 0, REPLIED: 0, HIRED: 0, PASS: 0 };
  for (const t of transitions) counts[t.toStatus] = (counts[t.toStatus] ?? 0) + 1;

  return NextResponse.json({
    counts,
    recent: recent.map((r) => ({ id: r.id, prospectName: r.prospect.name, toStatus: r.toStatus, createdAt: r.createdAt })),
  });
}
