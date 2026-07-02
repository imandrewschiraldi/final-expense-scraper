import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";

export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const agents = await db.user.findMany({
    where: { role: "AGENT" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      licensedStates: true,
      active: true,
      createdAt: true,
      _count: { select: { assignedLeads: true } },
    },
  });

  return NextResponse.json({ agents });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const body = await req.json();
  const { name, email, password, licensedStates } = body as {
    name?: string;
    email?: string;
    password?: string;
    licensedStates?: string[];
  };

  if (!name || !email || !password) {
    return NextResponse.json({ error: "name, email, and password are required" }, { status: 400 });
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const agent = await db.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "AGENT",
      licensedStates: licensedStates?.map((s) => s.toUpperCase()) ?? [],
    },
    select: { id: true, name: true, email: true, licensedStates: true, active: true },
  });

  return NextResponse.json({ agent }, { status: 201 });
}
