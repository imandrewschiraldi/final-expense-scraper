import { LeaderboardPanel } from "@/components/portal/LeaderboardPanel";

export const dynamic = "force-dynamic";

export default function PortalLeaderboardPage() {
  return (
    <div>
      <h1 className="mb-10 text-2xl font-extrabold tracking-wide text-white uppercase">Leaderboard</h1>
      <LeaderboardPanel />
    </div>
  );
}
