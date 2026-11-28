import { NextRequest, NextResponse } from "next/server";
import { requireAgent } from "@/lib/apiAuth";
import { db } from "@/lib/db";

// Each agent's own saved Contacts page views — personal, never shared
// across agents (see SmartList's own doc comment in schema.prisma).
export async function GET() {
  const guard = await requireAgent();
  if ("error" in guard) return guard.error;

  const smartLists = await db.smartList.findMany({
    where: { ownerId: guard.session.user.id },
    orderBy: { order: "asc" },
  });
  return NextResponse.json({ smartLists });
}

export async function POST(req: NextRequest) {
  const guard = await requireAgent();
  if ("error" in guard) return guard.error;

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const ownerId = guard.session.user.id;
  const maxOrder = await db.smartList.aggregate({
    where: { ownerId },
    _max: { order: true },
  });

  const smartList = await db.smartList.create({
    data: {
      ownerId,
      name,
      filterConditions: body?.filterConditions ?? { logic: "AND", conditions: [] },
      visibleColumns: Array.isArray(body?.visibleColumns) ? body.visibleColumns : [],
      sortConfig: body?.sortConfig ?? undefined,
      pageSize: typeof body?.pageSize === "number" ? body.pageSize : 20,
      order: (maxOrder._max.order ?? 0) + 1,
    },
  });
  return NextResponse.json({ smartList }, { status: 201 });
}
