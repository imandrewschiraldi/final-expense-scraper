import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/apiAuth";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const existing = await db.goal.findUnique({ where: { id } });
  if (!existing || existing.userId !== guard.session.user.id) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  const body = await req.json();
  const { targetValue, periodStart, periodEnd } = body as {
    targetValue?: number;
    periodStart?: string;
    periodEnd?: string;
  };

  const goal = await db.goal.update({
    where: { id },
    data: {
      ...(targetValue !== undefined ? { targetValue } : {}),
      ...(periodStart !== undefined ? { periodStart: new Date(periodStart) } : {}),
      ...(periodEnd !== undefined ? { periodEnd: new Date(periodEnd) } : {}),
    },
  });

  return NextResponse.json({ goal });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const existing = await db.goal.findUnique({ where: { id } });
  if (!existing || existing.userId !== guard.session.user.id) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  await db.goal.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
