import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { getAgencySettings, setOverviewSubtitle } from "@/lib/agencySettings";
import { DEFAULT_OVERVIEW_SUBTITLE_TEXT } from "@/lib/overviewSubtitle";
import { OverviewSubtitleColor } from "@prisma/client";

const COLORS: OverviewSubtitleColor[] = ["WHITE", "GRAY", "COPPER"];
// Generous for a one-line subtitle under the welcome heading without
// letting it run long enough to wrap awkwardly against the Edit
// Layout/Submit Policy button that shares the row.
const TEXT_MAX = 200;

function shape(settings: { overviewSubtitleText: string; overviewSubtitleColor: OverviewSubtitleColor; overviewSubtitleBold: boolean }) {
  return { text: settings.overviewSubtitleText, color: settings.overviewSubtitleColor, bold: settings.overviewSubtitleBold };
}

export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const settings = await getAgencySettings();
  return NextResponse.json(shape(settings));
}

export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const body = await req.json().catch(() => null);
  const { text, color, bold } = (body ?? {}) as { text?: string; color?: string; bold?: boolean };

  if (typeof text !== "string") {
    return NextResponse.json({ error: "Invalid text." }, { status: 400 });
  }
  if (text.length > TEXT_MAX) {
    return NextResponse.json({ error: `Keep it under ${TEXT_MAX} characters.` }, { status: 400 });
  }
  if (!COLORS.includes(color as OverviewSubtitleColor)) {
    return NextResponse.json({ error: "Invalid color." }, { status: 400 });
  }
  if (typeof bold !== "boolean") {
    return NextResponse.json({ error: "Invalid bold value." }, { status: 400 });
  }

  // Clearing the text resets to the default message rather than being
  // rejected — admin posts a training reminder or a daily competition
  // message for a while, then empties it to go back to normal.
  const resolvedText = text.trim() || DEFAULT_OVERVIEW_SUBTITLE_TEXT;
  const settings = await setOverviewSubtitle({ text: resolvedText, color: color as OverviewSubtitleColor, bold });
  return NextResponse.json(shape(settings));
}
