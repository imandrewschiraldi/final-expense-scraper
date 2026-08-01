import { NextResponse } from "next/server";
import { requireAdminOrManager } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { rangeSince } from "@/lib/dashboardRange";
import { metricsForWindow } from "@/lib/personalDashboard";

export async function GET() {
  const guard = await requireAdminOrManager();
  if ("error" in guard) return guard.error;

  const downline = await db.user.findMany({
    where: { managerId: guard.session.user.id, role: "AGENT" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });

  const since = rangeSince("monthly") ?? undefined;
  const agents = await Promise.all(
    downline.map(async (agent) => ({
      ...agent,
      metrics: await metricsForWindow(agent.id, { gte: since }),
    })),
  );

  return NextResponse.json({ agents });
}
