import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrManager } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { APPLICATION_STATUSES } from "@/lib/jobApplications";

const STATUS_IDS = APPLICATION_STATUSES.map((s) => s.id);

/**
 * Updates an applicant's funnel status, logging a JobApplicationStatusHistory
 * row whenever the status actually changes — same pattern as the Recruiting
 * Radar prospects route, so the Applications dashboard can show real
 * activity ("6 interviewed this week") instead of just a live snapshot.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminOrManager();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const { status } = (await req.json().catch(() => ({}))) as { status?: string };
  if (!status || !STATUS_IDS.includes(status as (typeof STATUS_IDS)[number])) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const existing = await db.jobApplication.findUnique({ where: { id }, select: { status: true } });
  if (!existing) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const nextStatus = status as (typeof STATUS_IDS)[number];
  const application = await db.jobApplication.update({
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

  return NextResponse.json({ application });
}
