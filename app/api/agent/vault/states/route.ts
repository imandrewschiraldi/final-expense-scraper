import { NextResponse } from "next/server";
import { requireAgent } from "@/lib/apiAuth";
import { db } from "@/lib/db";

export async function GET() {
  const guard = await requireAgent();
  if ("error" in guard) return guard.error;

  const grouped = await db.lead.groupBy({
    by: ["state"],
    where: { isVaulted: true },
    _count: { _all: true },
  });

  const states = grouped
    .map((g) => ({ state: g.state, count: g._count._all }))
    .sort((a, b) => a.state.localeCompare(b.state));

  return NextResponse.json({ states });
}
