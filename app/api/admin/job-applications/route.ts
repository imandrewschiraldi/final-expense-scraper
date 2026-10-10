import { NextResponse } from "next/server";
import { requireAdminOrManager } from "@/lib/apiAuth";
import { db } from "@/lib/db";

/**
 * Every inbound job application, newest first, with its status-change
 * history — the Applications panel's list, live status counts, and
 * time-windowed activity tiles all render off this in full.
 */
export async function GET() {
  const guard = await requireAdminOrManager();
  if ("error" in guard) return guard.error;

  const applications = await db.jobApplication.findMany({
    orderBy: { appliedAt: "desc" },
    include: {
      statusHistory: {
        select: { toStatus: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return NextResponse.json({ applications });
}
