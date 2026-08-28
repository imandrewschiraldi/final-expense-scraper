import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/apiAuth";
import { db } from "@/lib/db";

/** Read-only carrier/plan list for the Submit Policy rate-plan picker —
 *  every role needs this (whoever is submitting the deal), unlike the
 *  admin CRUD routes that manage the rates themselves. */
export async function GET() {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  const carriers = await db.carrier.findMany({
    orderBy: { name: "asc" },
    include: { plans: { orderBy: { name: "asc" }, select: { id: true, name: true } } },
  });

  return NextResponse.json({ carriers });
}
