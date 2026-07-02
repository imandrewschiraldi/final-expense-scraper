import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const body = await req.json();
  const { direction } = body as { direction?: "up" | "down" };

  const modules = await db.trainingModule.findMany({ orderBy: { order: "asc" }, select: { id: true, order: true } });
  const index = modules.findIndex((m) => m.id === id);
  if (index === -1) {
    return NextResponse.json({ error: "Module not found" }, { status: 404 });
  }

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= modules.length) {
    return NextResponse.json({ ok: true });
  }

  const current = modules[index];
  const swapWith = modules[swapIndex];

  await db.$transaction([
    db.trainingModule.update({ where: { id: current.id }, data: { order: swapWith.order } }),
    db.trainingModule.update({ where: { id: swapWith.id }, data: { order: current.order } }),
  ]);

  return NextResponse.json({ ok: true });
}
