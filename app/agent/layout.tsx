import { auth } from "@/lib/auth";
import { AgentNav } from "@/components/agent/AgentNav";

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background">
      <AgentNav agentName={session?.user.name ?? ""} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
