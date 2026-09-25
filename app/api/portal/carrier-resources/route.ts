import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/apiAuth";
import { db } from "@/lib/db";

/** Read-only feed for the Carrier Resources page — every carrier with at least one contact or link, each already ordered. */
export async function GET() {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  const carriers = await db.carrier.findMany({
    where: { OR: [{ contacts: { some: {} } }, { links: { some: {} } }] },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      contacts: { orderBy: { order: "asc" }, select: { id: true, label: true, phone: true } },
      links: { orderBy: { order: "asc" }, select: { id: true, label: true, url: true, isAgentPortal: true } },
    },
  });

  return NextResponse.json({ carriers });
}
