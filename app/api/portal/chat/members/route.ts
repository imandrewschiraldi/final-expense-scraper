import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageChannels } from "@/lib/chat";

export const dynamic = "force-dynamic";

/** Everyone eligible to be picked for a "specific people" channel. Admin-only — this is purely for the channel-creation/edit picker. */
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageChannels(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await db.user.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, role: true },
  });

  return NextResponse.json({ users });
}
