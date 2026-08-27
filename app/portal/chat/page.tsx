import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canManageChannels } from "@/lib/chat";
import { ChatRoom } from "@/components/portal/chat/ChatRoom";
import { PageHeading } from "@/components/portal/PageHeading";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div>
      <PageHeading slug="team-chat" alt="Team Chat" wrapperClassName="mb-6 mt-5 flex justify-center lg:mt-[28px]" />
      <ChatRoom me={session.user.id} canManage={canManageChannels(session.user.role)} />
    </div>
  );
}
