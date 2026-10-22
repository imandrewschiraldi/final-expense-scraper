import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/apiAuth";
import { db } from "@/lib/db";

/**
 * Marks the platform guided tour as seen — called once, whether the viewer
 * finished every step or skipped out partway. Only ever sets the timestamp
 * if it isn't already set, so a voluntary replay later doesn't overwrite
 * the original "first seen" date.
 */
export async function POST() {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  const user = await db.user.findUnique({
    where: { id: guard.session.user.id },
    select: { tourCompletedAt: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!user.tourCompletedAt) {
    await db.user.update({ where: { id: guard.session.user.id }, data: { tourCompletedAt: new Date() } });
  }

  return NextResponse.json({ ok: true });
}
