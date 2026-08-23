import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const body = await req.json();
  const { role, managerId } = body as { role?: "AGENT" | "MANAGER"; managerId?: string | null };

  const target = await db.user.findUnique({ where: { id } });
  if (!target || (target.role !== "AGENT" && target.role !== "MANAGER")) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (role === "AGENT" && target.role === "MANAGER") {
    const downlineCount = await db.user.count({ where: { managerId: id } });
    if (downlineCount > 0) {
      return NextResponse.json(
        { error: "Reassign this manager's agents to someone else before demoting them." },
        { status: 400 },
      );
    }
  }

  if (managerId) {
    if (managerId === id) {
      return NextResponse.json({ error: "A user can't manage themselves." }, { status: 400 });
    }
    const manager = await db.user.findUnique({ where: { id: managerId } });
    // Admins can also personally run a downline — they don't need to hold
    // the MANAGER role to have agents report to them.
    if (!manager || (manager.role !== "MANAGER" && manager.role !== "ADMIN")) {
      return NextResponse.json({ error: "managerId must reference an existing manager or admin." }, { status: 400 });
    }
  }

  const user = await db.user.update({
    where: { id },
    data: {
      ...(role !== undefined ? { role, ...(role === "MANAGER" ? { managerId: null } : {}) } : {}),
      ...(managerId !== undefined ? { managerId } : {}),
    },
    select: { id: true, name: true, email: true, role: true, managerId: true, active: true },
  });

  return NextResponse.json({ user });
}
