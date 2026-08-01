import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireAnyRole } from "@/lib/apiAuth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  const body = await req.json();
  const { currentPassword, newPassword } = body as { currentPassword?: string; newPassword?: string };

  if (!currentPassword || !newPassword || newPassword.length < 8) {
    return NextResponse.json(
      { error: "Current password and a new password of at least 8 characters are required" },
      { status: 400 },
    );
  }

  const user = await db.user.findUnique({
    where: { id: guard.session.user.id },
    select: { passwordHash: true },
  });

  if (!user?.passwordHash || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.user.update({ where: { id: guard.session.user.id }, data: { passwordHash } });

  return NextResponse.json({ ok: true });
}
