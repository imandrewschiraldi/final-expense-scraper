import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";

/** Reorders a carrier's position on the Carrier Resources grid by swapping its display order with its neighbor. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const body = await req.json();
  const { direction } = body as { direction?: "up" | "down" };

  const carriers = await db.carrier.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: { id: true, order: true },
  });

  const index = carriers.findIndex((c) => c.id === id);
  if (index === -1) {
    return NextResponse.json({ error: "Carrier not found" }, { status: 404 });
  }

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= carriers.length) {
    return NextResponse.json({ ok: true });
  }

  const current = carriers[index];
  const swapWith = carriers[swapIndex];

  await db.$transaction([
    db.carrier.update({ where: { id: current.id }, data: { order: swapWith.order } }),
    db.carrier.update({ where: { id: swapWith.id }, data: { order: current.order } }),
  ]);

  return NextResponse.json({ ok: true });
}
