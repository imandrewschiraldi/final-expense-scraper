import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { createAndSendInvite } from "@/lib/invite";

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
      passwordHash: true,
      createdAt: true,
      _count: { select: { assignedLeads: true } },
    },
  });

  return NextResponse.json({
    agents: agents.map(({ passwordHash, ...agent }) => ({
      ...agent,
      inviteAccepted: passwordHash !== null,
    })),
  });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const body = await req.json();
  const { name, email, licensedStates } = body as {
    name?: string;
    email?: string;
    licensedStates?: string[];
  };

  if (!name || !email) {
    return NextResponse.json({ error: "name and email are required" }, { status: 400 });
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const agent = await db.user.create({
    data: {
      name,
      email,
      role: "AGENT",
      licensedStates: licensedStates?.map((s) => s.toUpperCase()) ?? [],
    },
    select: { id: true, name: true, email: true, licensedStates: true, active: true, createdAt: true },
  });

  try {
    await createAndSendInvite(agent);
  } catch (err) {
    return NextResponse.json(
      {
        agent: { ...agent, inviteAccepted: false },
        warning: `Agent was created, but the invite email failed to send: ${
          err instanceof Error ? err.message : "Unknown error"
        }. Use "Resend Invite" once this is fixed.`,
      },
      { status: 201 },
    );
  }

  return NextResponse.json({ agent: { ...agent, inviteAccepted: false } }, { status: 201 });
}
