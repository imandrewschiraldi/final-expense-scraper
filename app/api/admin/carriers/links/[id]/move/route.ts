import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const body = await req.json();
  const { direction } = body as { direction?: "up" | "down" };

  const link = await db.carrierLink.findUnique({ where: { id }, select: { carrierId: true } });
  if (!link) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  const links = await db.carrierLink.findMany({
    where: { carrierId: link.carrierId },
    orderBy: { order: "asc" },
    select: { id: true, order: true },
  });

  const index = links.findIndex((l) => l.id === id);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= links.length) {
    return NextResponse.json({ ok: true });
  }

  const current = links[index];
  const swapWith = links[swapIndex];

  await db.$transaction([
    db.carrierLink.update({ where: { id: current.id }, data: { order: swapWith.order } }),
    db.carrierLink.update({ where: { id: swapWith.id }, data: { order: current.order } }),
  ]);

  return NextResponse.json({ ok: true });
}
