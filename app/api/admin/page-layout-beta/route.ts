import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import {
  getAgencySettings,
  setPageLayoutBetaEnabled,
} from "@/lib/agencySettings";

export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const settings = await getAgencySettings();
  return NextResponse.json({
    pageLayoutBetaEnabled: settings.pageLayoutBetaEnabled,
  });
}

export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const body = await req.json().catch(() => null);
  if (typeof body?.pageLayoutBetaEnabled !== "boolean") {
    return NextResponse.json(
      { error: "pageLayoutBetaEnabled must be a boolean." },
      { status: 400 },
    );
  }

  const settings = await setPageLayoutBetaEnabled(body.pageLayoutBetaEnabled);
  return NextResponse.json({
    pageLayoutBetaEnabled: settings.pageLayoutBetaEnabled,
  });
}
