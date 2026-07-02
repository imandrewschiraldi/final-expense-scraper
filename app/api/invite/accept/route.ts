import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { hashInviteToken } from "@/lib/invite";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { token, password } = body as { token?: string; password?: string };

  if (!token || !password || password.length < 8) {
    return NextResponse.json(
      { error: "A token and a password of at least 8 characters are required" },
      { status: 400 },
    );
  }

  const inviteTokenHash = hashInviteToken(token);
  const user = await db.user.findUnique({ where: { inviteTokenHash } });

  if (!user || !user.inviteTokenExpiresAt || user.inviteTokenExpiresAt < new Date()) {
    return NextResponse.json({ error: "This invite link is invalid or has expired" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      inviteTokenHash: null,
      inviteTokenExpiresAt: null,
    },
  });

  return NextResponse.json({ ok: true, email: user.email });
}
