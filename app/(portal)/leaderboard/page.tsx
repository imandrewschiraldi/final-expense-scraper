import { LeaderboardPanel } from "@/components/portal/LeaderboardPanel";
import { PageHeading } from "@/components/portal/PageHeading";

export const dynamic = "force-dynamic";

export default function PortalLeaderboardPage() {
  return (
    <div>
      <PageHeading slug="leaderboard" alt="Leaderboard" />
      <LeaderboardPanel />
    </div>
  );
}
