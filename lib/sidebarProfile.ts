import { db } from "@/lib/db";
import { hasVaultAccess } from "@/lib/vault";
import { getAgencySettings } from "@/lib/agencySettings";
import { SidebarProfile } from "@/components/portal/Sidebar";

/**
 * Fetched in each of the three portal layouts ((portal)/admin/agent) and
 * passed straight through to Sidebar's `initialProfile` prop, instead of
 * leaving the nav list's feature-gated items — Vault, Agency Dashboard,
 * Recruiting Radar, Leaderboard — to Sidebar's own client-side /api/profile
 * fetch alone. Without this, every single page load would render those
 * items as hidden (profile starts null) and then pop them in a beat later
 * once that fetch resolves, visibly reflowing every row under them — the
 * sidebar "glitching and moving" on refresh. Sidebar's own fetch still runs
 * after mount too, to pick up a flag flipped elsewhere in the same session.
 *
 * Also carries cardLayoutEnabled — now an agency-wide setting (every agent
 * sees the same thing, flipped from one admin control, not a per-account
 * opt-in) — for the exact same reason — AppShell used to start it false and
 * only flip it true once its own client-side fetch resolved, so every
 * refresh briefly rendered the old full-bleed layout (sidebar border and
 * all) before snapping into the overlay-card one.
 */
export async function getInitialSidebarProfile(
  userId: string,
): Promise<SidebarProfile | null> {
  const [user, { leaderboardEnabled, pageLayoutBetaEnabled }] =
    await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          profileImageUrl: true,
          compLevel: true,
          createdAt: true,
          vaultEnabled: true,
          vaultAccessStartedAt: true,
          agencyDashboardEnabled: true,
          recruitingRadarEnabled: true,
          f90EnrolledAt: true,
        },
      }),
      getAgencySettings(),
    ]);

  if (!user) return null;

  return {
    name: user.name,
    profileImageUrl: user.profileImageUrl,
    compLevel: user.compLevel,
    hasVaultAccess: hasVaultAccess(user),
    agencyDashboardEnabled: user.agencyDashboardEnabled,
    recruitingRadarEnabled: user.recruitingRadarEnabled,
    leaderboardEnabled,
    cardLayoutEnabled: pageLayoutBetaEnabled,
    f90Enrolled: user.f90EnrolledAt !== null,
  };
}
