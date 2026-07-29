import { auth } from "@/lib/auth";
import { LeaderboardPanel } from "@/components/portal/LeaderboardPanel";

export const dynamic = "force-dynamic";

export default async function PortalLeaderboardPage() {
  const session = await auth();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold tracking-wide text-white uppercase">Leaderboard</h1>
      <LeaderboardPanel isAdmin={session?.user.role === "ADMIN"} />
    </div>
  );
}
