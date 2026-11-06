import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import {
  getAgencySettings,
  setLeaderboardAllTimeEnabled,
  setLeaderboardEnabled,
} from "@/lib/agencySettings";

export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const settings = await getAgencySettings();
  return NextResponse.json({
    leaderboardEnabled: settings.leaderboardEnabled,
    leaderboardAllTimeEnabled: settings.leaderboardAllTimeEnabled,
  });
}

export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const body = await req.json().catch(() => null);
  if (
    body?.leaderboardEnabled === undefined &&
    body?.leaderboardAllTimeEnabled === undefined
  ) {
    return NextResponse.json(
      {
        error:
          "leaderboardEnabled and/or leaderboardAllTimeEnabled must be provided as booleans.",
      },
      { status: 400 },
    );
  }
  if (
    body?.leaderboardEnabled !== undefined &&
    typeof body.leaderboardEnabled !== "boolean"
  ) {
    return NextResponse.json(
      { error: "leaderboardEnabled must be a boolean." },
      { status: 400 },
    );
  }
  if (
    body?.leaderboardAllTimeEnabled !== undefined &&
    typeof body.leaderboardAllTimeEnabled !== "boolean"
  ) {
    return NextResponse.json(
      { error: "leaderboardAllTimeEnabled must be a boolean." },
      { status: 400 },
    );
  }

  let settings = await getAgencySettings();
  if (body?.leaderboardEnabled !== undefined) {
    settings = await setLeaderboardEnabled(body.leaderboardEnabled);
  }
  if (body?.leaderboardAllTimeEnabled !== undefined) {
    settings = await setLeaderboardAllTimeEnabled(
      body.leaderboardAllTimeEnabled,
    );
  }

  return NextResponse.json({
    leaderboardEnabled: settings.leaderboardEnabled,
    leaderboardAllTimeEnabled: settings.leaderboardAllTimeEnabled,
  });
}
