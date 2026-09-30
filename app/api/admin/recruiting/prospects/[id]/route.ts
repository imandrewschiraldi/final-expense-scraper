import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { RECRUIT_STATUSES } from "@/lib/recruitingRadar";

const STATUS_IDS = RECRUIT_STATUSES.map((s) => s.id);

/** Updates a prospect's pipeline status (To Contact / DM'd / Replied / Hired / Pass). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const { status } = (await req.json().catch(() => ({}))) as { status?: string };
  if (!status || !STATUS_IDS.includes(status as (typeof STATUS_IDS)[number])) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const prospect = await db.recruitProspect
    .update({
      where: { id },
      data: { status: status as (typeof STATUS_IDS)[number] },
    })
    .catch(() => null);

  if (!prospect) {
    return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
  }

  return NextResponse.json({ prospect });
}
