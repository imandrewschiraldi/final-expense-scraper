import { NextResponse } from "next/server";
import { requireAgent } from "@/lib/apiAuth";
import { getWeeklyHistory } from "@/lib/kpiTrackerServer";

export async function GET() {
  const guard = await requireAgent();
  if ("error" in guard) return guard.error;

  const weeks = await getWeeklyHistory(guard.session.user.id);
  return NextResponse.json({ weeks });
}
