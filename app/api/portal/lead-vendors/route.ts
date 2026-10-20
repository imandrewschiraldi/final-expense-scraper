import { NextResponse } from "next/server";
import { requireAgent } from "@/lib/apiAuth";
import { db } from "@/lib/db";

/** Read-only feed for the Buy Leads page — every vendor, already ordered. */
export async function GET() {
  const guard = await requireAgent();
  if ("error" in guard) return guard.error;

  const vendors = await db.leadVendor.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: { id: true, name: true, description: true, url: true },
  });

  return NextResponse.json({ vendors });
}
