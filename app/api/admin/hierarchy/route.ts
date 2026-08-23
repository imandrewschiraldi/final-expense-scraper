import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";

export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const users = await db.user.findMany({
    where: { role: { in: ["ADMIN", "MANAGER", "AGENT"] } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true, managerId: true, active: true },
  });

  return NextResponse.json({ users });
}
