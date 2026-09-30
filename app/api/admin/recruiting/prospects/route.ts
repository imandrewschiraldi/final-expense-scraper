import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";

/** Every sourced prospect, newest first — the Recruiting Radar table and stat cards render off this in full (the list stays small enough not to need pagination). */
export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const prospects = await db.recruitProspect.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ prospects });
}
