import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { ROLE_SWITCH_EMAIL, SWITCHABLE_ROLES, SwitchableRole } from "@/lib/roleSwitch";

export async function POST(req: NextRequest) {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  if (guard.session.user.email !== ROLE_SWITCH_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { role } = body as { role?: string };
  if (!SWITCHABLE_ROLES.includes(role as SwitchableRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const user = await db.user.update({
    where: { id: guard.session.user.id },
    data: { role: role as SwitchableRole },
    select: { role: true },
  });

  return NextResponse.json({ role: user.role });
}
