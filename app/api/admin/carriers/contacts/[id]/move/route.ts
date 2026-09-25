import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const body = await req.json();
  const { direction } = body as { direction?: "up" | "down" };

  const contact = await db.carrierContact.findUnique({ where: { id }, select: { carrierId: true } });
  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const contacts = await db.carrierContact.findMany({
    where: { carrierId: contact.carrierId },
    orderBy: { order: "asc" },
    select: { id: true, order: true },
  });

  const index = contacts.findIndex((c) => c.id === id);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= contacts.length) {
    return NextResponse.json({ ok: true });
  }

  const current = contacts[index];
  const swapWith = contacts[swapIndex];

  await db.$transaction([
    db.carrierContact.update({ where: { id: current.id }, data: { order: swapWith.order } }),
    db.carrierContact.update({ where: { id: swapWith.id }, data: { order: current.order } }),
  ]);

  return NextResponse.json({ ok: true });
}
