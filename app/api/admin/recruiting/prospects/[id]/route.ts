import { NextRequest, NextResponse } from "next/server";
import { requireRecruitingRadarAccess } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { RECRUIT_STATUSES } from "@/lib/recruitingRadar";

const STATUS_IDS = RECRUIT_STATUSES.map((s) => s.id);

/**
 * Updates a prospect's pipeline status (To Contact / DM'd / Replied / Hired
 * / Pass), logging a RecruitStatusHistory row whenever the status actually
 * changes — that log is what lets the dashboard show real outreach
 * activity ("14 DM'd this week") instead of just a live snapshot.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRecruitingRadarAccess();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const { status } = (await req.json().catch(() => ({}))) as { status?: string };
  if (!status || !STATUS_IDS.includes(status as (typeof STATUS_IDS)[number])) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const existing = await db.recruitProspect.findUnique({ where: { id }, select: { status: true } });
  if (!existing) {
    return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
  }

  const nextStatus = status as (typeof STATUS_IDS)[number];
  const prospect = await db.recruitProspect.update({
    where: { id },
    data: {
      status: nextStatus,
      ...(nextStatus !== existing.status
        ? {
            statusHistory: {
              create: { fromStatus: existing.status, toStatus: nextStatus, changedById: guard.session.user.id },
            },
          }
        : {}),
    },
    include: { statusHistory: { select: { toStatus: true, createdAt: true }, orderBy: { createdAt: "asc" } } },
  });

  return NextResponse.json({ prospect });
}
