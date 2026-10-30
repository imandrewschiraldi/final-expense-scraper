import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { getAgencySettings, setLeaderboardAllTimeEnabled } from "@/lib/agencySettings";

export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const settings = await getAgencySettings();
  return NextResponse.json({ leaderboardAllTimeEnabled: settings.leaderboardAllTimeEnabled });
}

export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const body = await req.json().catch(() => null);
  if (typeof body?.leaderboardAllTimeEnabled !== "boolean") {
    return NextResponse.json({ error: "leaderboardAllTimeEnabled must be a boolean." }, { status: 400 });
  }

  const settings = await setLeaderboardAllTimeEnabled(body.leaderboardAllTimeEnabled);
  return NextResponse.json({ leaderboardAllTimeEnabled: settings.leaderboardAllTimeEnabled });
}
