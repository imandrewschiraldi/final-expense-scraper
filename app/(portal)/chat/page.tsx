import { Suspense } from "react";
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
      <PageHeading slug="team-chat" alt="Team Chat" />
      {/* useSearchParams() (for the Overview Team Chat widget's ?channel=
          deep link) requires a Suspense boundary, or this whole route would
          opt out of static rendering. */}
      <Suspense>
        <ChatRoom
          me={session.user.id}
          canManage={canManageChannels(session.user.role)}
        />
      </Suspense>
    </div>
  );
}
