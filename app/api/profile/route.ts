import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { hasVaultAccess } from "@/lib/vault";

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
      npn: true,
      residentState: true,
      createdAt: true,
      vaultEnabled: true,
    },
  });

  if (!user) return NextResponse.json({ profile: null });

  const { createdAt, vaultEnabled, ...profile } = user;
  return NextResponse.json({ profile: { ...profile, hasVaultAccess: hasVaultAccess({ createdAt, vaultEnabled }) } });
}

export async function PATCH(req: NextRequest) {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  const body = await req.json();
  const { licensedStates, npn, residentState } = body as {
    licensedStates?: string[];
    npn?: string | null;
    residentState?: string | null;
  };

  // Comp level and role are admin-only (set via /api/admin/agents/[id]) and
  // deliberately not accepted here.
  const user = await db.user.update({
    where: { id: guard.session.user.id },
    data: {
      ...(licensedStates !== undefined ? { licensedStates: licensedStates.map((s) => s.toUpperCase()) } : {}),
      ...(npn !== undefined ? { npn: npn?.trim() || null } : {}),
      ...(residentState !== undefined ? { residentState: residentState?.trim().toUpperCase() || null } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      licensedStates: true,
      profileImageUrl: true,
      compLevel: true,
      npn: true,
      residentState: true,
    },
  });

  return NextResponse.json({ profile: user });
}
