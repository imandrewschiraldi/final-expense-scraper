import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";

/** Reorders a lead vendor's position on the Buy Leads page by swapping its display order with its neighbor. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const body = await req.json();
  const { direction } = body as { direction?: "up" | "down" };

  const vendors = await db.leadVendor.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: { id: true, order: true },
  });

  const index = vendors.findIndex((v) => v.id === id);
  if (index === -1) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= vendors.length) {
    return NextResponse.json({ ok: true });
  }

  const current = vendors[index];
  const swapWith = vendors[swapIndex];

  await db.$transaction([
    db.leadVendor.update({ where: { id: current.id }, data: { order: swapWith.order } }),
    db.leadVendor.update({ where: { id: swapWith.id }, data: { order: current.order } }),
  ]);

  return NextResponse.json({ ok: true });
}
