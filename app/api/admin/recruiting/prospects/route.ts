import { NextResponse } from "next/server";
import { requireRecruitingRadarAccess } from "@/lib/apiAuth";
import { db } from "@/lib/db";

/**
 * Every sourced prospect, newest first, with its status-change history —
 * the Recruiting Radar table, live status counts, and the time-windowed
 * activity tiles (e.g. "14 DM'd this week") all render off this in full
 * (the list stays small enough not to need pagination).
 */
export async function GET() {
  const guard = await requireRecruitingRadarAccess();
  if ("error" in guard) return guard.error;

  const prospects = await db.recruitProspect.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      statusHistory: {
        select: { toStatus: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return NextResponse.json({ prospects });
}
