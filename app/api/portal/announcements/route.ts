import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/apiAuth";
import { db } from "@/lib/db";

export async function GET() {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  const items = await db.announcementItem.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
    select: { id: true, type: true, title: true, url: true },
  });

  return NextResponse.json({ items });
}
