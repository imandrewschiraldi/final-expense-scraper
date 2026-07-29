import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/apiAuth";
import { db } from "@/lib/db";

export async function GET() {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  const user = await db.user.findUnique({
    where: { id: guard.session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      licensedStates: true,
      profileImageUrl: true,
      compLevel: true,
    },
  });

  return NextResponse.json({ profile: user });
}

export async function PATCH(req: NextRequest) {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  const body = await req.json();
  const { licensedStates } = body as { licensedStates?: string[] };

  // Comp level is admin-only (set via /api/admin/agents/[id]) and deliberately
  // not accepted here.
  const user = await db.user.update({
    where: { id: guard.session.user.id },
    data: {
      ...(licensedStates !== undefined ? { licensedStates: licensedStates.map((s) => s.toUpperCase()) } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      licensedStates: true,
      profileImageUrl: true,
      compLevel: true,
    },
  });

  return NextResponse.json({ profile: user });
}
