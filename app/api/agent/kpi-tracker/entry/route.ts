import { NextRequest, NextResponse } from "next/server";
import { requireAgent } from "@/lib/apiAuth";
import { getDailyEntry, upsertDailyEntry } from "@/lib/kpiTrackerServer";
import { MAX_LEAD_SPEND, type KpiDailyInput } from "@/lib/kpiTracker";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const NUMERIC_FIELDS = [
  "deposits",
  "leadSpend",
  "hoursWorked",
  "apptsScheduled",
  "dials",
  "answered",
  "apptsShown",
  "presentations",
  "dealsClosed",
] as const;

export async function GET(req: NextRequest) {
  const guard = await requireAgent();
  if ("error" in guard) return guard.error;

  const date = req.nextUrl.searchParams.get("date");
  if (!date || !DATE_RE.test(date)) {
    return NextResponse.json(
      { error: "A valid date is required." },
      { status: 400 },
    );
  }

  const entry = await getDailyEntry(guard.session.user.id, date);
  return NextResponse.json({ entry });
}

export async function PATCH(req: NextRequest) {
  const guard = await requireAgent();
  if ("error" in guard) return guard.error;

  const body = await req.json();
  const { date, ...fields } = body as { date?: string } & Record<
    string,
    unknown
  >;
  if (!date || !DATE_RE.test(date)) {
    return NextResponse.json(
      { error: "A valid date is required." },
      { status: 400 },
    );
  }

  const patch: KpiDailyInput = {};
  for (const key of NUMERIC_FIELDS) {
    const value = fields[key];
    if (value === undefined) continue;
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      return NextResponse.json(
        { error: `${key} must be a non-negative number.` },
        { status: 400 },
      );
    }
    patch[key] = key === "leadSpend" ? Math.min(value, MAX_LEAD_SPEND) : value;
  }

  await upsertDailyEntry(guard.session.user.id, date, patch);
  const entry = await getDailyEntry(guard.session.user.id, date);
  return NextResponse.json({ entry });
}
