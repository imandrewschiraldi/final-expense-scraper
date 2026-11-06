import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAgencySettings } from "@/lib/agencySettings";
import { LeaderboardPanel } from "@/components/portal/LeaderboardPanel";
import { LeaderboardVisibilityToggle } from "@/components/portal/LeaderboardVisibilityToggle";
import { PageHeading } from "@/components/portal/PageHeading";

export const dynamic = "force-dynamic";

export default async function PortalLeaderboardPage() {
  const session = await auth();
  const isAdmin = session?.user.role === "ADMIN";
  const { leaderboardEnabled } = await getAgencySettings();

  // The master switch hides this page from everyone but admins — an admin
  // always keeps access (and the toggle below) so it can be turned back on.
  if (!leaderboardEnabled && !isAdmin) {
    redirect("/overview");
  }

  return (
    <div>
      <PageHeading slug="leaderboard" alt="Leaderboard" />
      {isAdmin && (
        <LeaderboardVisibilityToggle initialEnabled={leaderboardEnabled} />
      )}
      <LeaderboardPanel />
    </div>
  );
}
