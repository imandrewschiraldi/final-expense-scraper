import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";

export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const runs = await db.assignmentRun.findMany({
    orderBy: { weekOf: "desc" },
    take: 12,
    include: {
      flags: {
        include: { agent: { select: { id: true, name: true } } },
      },
    },
  });

  return NextResponse.json({ runs });
}
