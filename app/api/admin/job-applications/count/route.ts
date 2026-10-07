import { NextResponse } from "next/server";
import { requireRecruitingRadarAccess } from "@/lib/apiAuth";
import { db } from "@/lib/db";

/** Lightweight summary for the "Applications" nav card on Recruiting Radar — just enough to show a number without fetching the full list. */
export async function GET() {
  const guard = await requireRecruitingRadarAccess();
  if ("error" in guard) return guard.error;

  const [total, newCount] = await Promise.all([
    db.jobApplication.count(),
    db.jobApplication.count({ where: { status: "NEW" } }),
  ]);

  return NextResponse.json({ total, new: newCount });
}
