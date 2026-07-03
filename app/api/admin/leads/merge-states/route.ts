import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { US_STATE_CODES } from "@/lib/usStates";

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const body = await req.json().catch(() => ({}));
  const { from, to } = body as { from?: string[]; to?: string };

  if (!to || !US_STATE_CODES.has(to)) {
    return NextResponse.json({ error: "Target state must be a valid two-letter state code" }, { status: 400 });
  }
  if (!from || from.length === 0) {
    return NextResponse.json({ error: "Select at least one state value to merge" }, { status: 400 });
  }

  const sourceValues = from.filter((v) => v !== to);
  if (sourceValues.length === 0) {
    return NextResponse.json({ updated: 0 });
  }

  const result = await db.lead.updateMany({
    where: { state: { in: sourceValues } },
    data: { state: to },
  });

  return NextResponse.json({ updated: result.count });
}
