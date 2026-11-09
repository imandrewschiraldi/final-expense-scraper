import { NextRequest, NextResponse } from "next/server";
import { requireAgent } from "@/lib/apiAuth";
import { getPeriodSummary } from "@/lib/kpiTrackerServer";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  const guard = await requireAgent();
  if ("error" in guard) return guard.error;

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  if (!from || !to || !DATE_RE.test(from) || !DATE_RE.test(to) || from > to) {
    return NextResponse.json(
      { error: "A valid from/to date range is required." },
      { status: 400 },
    );
  }

  const summary = await getPeriodSummary(guard.session.user.id, from, to);
  return NextResponse.json({ summary });
}
