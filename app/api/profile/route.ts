import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { hasVaultAccess } from "@/lib/vault";
import { getAgencySettings } from "@/lib/agencySettings";

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
      demoModeEnabled: true,
      createdAt: true,
      vaultEnabled: true,
      vaultAccessStartedAt: true,
      agencyDashboardEnabled: true,
      recruitingRadarEnabled: true,
      tourCompletedAt: true,
    },
  });

  if (!user) return NextResponse.json({ profile: null });

  const { createdAt, vaultEnabled, vaultAccessStartedAt, ...profile } = user;
  const { leaderboardEnabled, pageLayoutBetaEnabled } =
    await getAgencySettings();
  return NextResponse.json({
    profile: {
      ...profile,
      hasVaultAccess: hasVaultAccess({
        createdAt,
        vaultEnabled,
        vaultAccessStartedAt,
      }),
      leaderboardEnabled,
      // Agency-wide now (see /api/admin/page-layout-beta), not a per-user
      // field — carried in the same /api/profile payload AppShell already
      // polls on mount, so every role (not just the admin who can change
      // it) picks up the current value without its own dedicated fetch.
      pageLayoutBetaEnabled,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  const body = await req.json();
  const { licensedStates, npn, residentState, demoModeEnabled } = body as {
    licensedStates?: string[];
    npn?: string | null;
    residentState?: string | null;
    demoModeEnabled?: boolean;
  };

  // Comp level and role are admin-only (set via /api/admin/agents/[id]) and
  // deliberately not accepted here. The page-layout beta toggle is set
  // agency-wide via /api/admin/page-layout-beta, not per profile.
  const user = await db.user.update({
    where: { id: guard.session.user.id },
    data: {
      ...(licensedStates !== undefined
        ? { licensedStates: licensedStates.map((s) => s.toUpperCase()) }
        : {}),
      ...(npn !== undefined ? { npn: npn?.trim() || null } : {}),
      ...(residentState !== undefined
        ? { residentState: residentState?.trim().toUpperCase() || null }
        : {}),
      ...(demoModeEnabled !== undefined ? { demoModeEnabled } : {}),
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
      demoModeEnabled: true,
      agencyDashboardEnabled: true,
      recruitingRadarEnabled: true,
    },
  });

  return NextResponse.json({ profile: user });
}
