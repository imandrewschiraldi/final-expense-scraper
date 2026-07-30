import { auth } from "@/lib/auth";
import { BookOfBusinessPanel } from "@/components/portal/BookOfBusinessPanel";

export const dynamic = "force-dynamic";

export default async function PortalBookOfBusinessPage() {
  const session = await auth();

  return (
    <div>
      <h1 className="mb-10 text-2xl font-extrabold tracking-wide text-white uppercase">Book of Business</h1>
      <BookOfBusinessPanel isAgent={session?.user.role === "AGENT"} />
    </div>
  );
}
