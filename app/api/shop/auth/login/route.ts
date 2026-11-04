import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { setBuyerSession } from "@/lib/shop/session";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  const buyer = email ? await db.shopBuyer.findUnique({ where: { email } }) : null;
  if (!buyer || !(await bcrypt.compare(password, buyer.passwordHash))) {
    return NextResponse.json({ error: "That email and password don't match an account." }, { status: 401 });
  }
  await setBuyerSession(buyer.id);
  return NextResponse.json({ ok: true });
}
