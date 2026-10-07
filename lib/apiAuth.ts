import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function requireAdmin() {
  const session = await auth();
  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }
  if (session.user.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const;
  }
  return { session } as const;
}

// Managers can do everything an agent can (work leads, submit policies) on
// top of their elevated hierarchy/comp access elsewhere, so this allows both.
export async function requireAgent() {
  const session = await auth();
  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }
  if (session.user.role !== "AGENT" && session.user.role !== "MANAGER") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const;
  }
  return { session } as const;
}

export async function requireAdminOrManager() {
  const session = await auth();
  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }
  if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const;
  }
  return { session } as const;
}

// Portal features (Dashboard, Leaderboard, Book of Business) are shared
// between both roles — everyone on the team can see them.
export async function requireAnyRole() {
  const session = await auth();
  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }
  return { session } as const;
}

// Recruiting Radar is an admin tool by default; ADMIN always has access.
// Agents/managers only get in once an admin flips recruitingRadarEnabled
// on for their account specifically (see AgentsPanel) — unlike the other
// guards above, that flag isn't on the session, so it takes a DB lookup.
export async function requireRecruitingRadarAccess() {
  const session = await auth();
  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }
  if (session.user.role === "ADMIN") {
    return { session } as const;
  }
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { recruitingRadarEnabled: true } });
  if (!user?.recruitingRadarEnabled) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const;
  }
  return { session } as const;
}
