import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AgentNav } from "@/components/agent/AgentNav";
import { hasVaultAccess } from "@/lib/vault";

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  let showVault = false;
  if (session?.user.id) {
    const agent = await db.user.findUnique({ where: { id: session.user.id }, select: { createdAt: true } });
    showVault = agent ? hasVaultAccess(agent.createdAt) : false;
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background">
      <AgentNav agentName={session?.user.name ?? ""} showVault={showVault} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
