import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canManageChannels } from "@/lib/chat";
import { ChatRoom } from "@/components/portal/chat/ChatRoom";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div>
      <h1 className="mb-8 text-2xl font-extrabold tracking-wide text-white uppercase">Team Chat</h1>
      <ChatRoom me={session.user.id} canManage={canManageChannels(session.user.role)} />
    </div>
  );
}
