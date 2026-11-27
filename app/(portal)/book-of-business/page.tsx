import { auth } from "@/lib/auth";
import { BookOfBusinessPanel } from "@/components/portal/BookOfBusinessPanel";
import { PageHeading } from "@/components/portal/PageHeading";

export const dynamic = "force-dynamic";

export default async function PortalBookOfBusinessPage() {
  const session = await auth();
  const role = session?.user.role ?? "AGENT";

  return (
    <div>
      <PageHeading slug="book-of-business" alt="Book of Business" />
      <BookOfBusinessPanel isAgent={role === "AGENT"} role={role} />
    </div>
  );
}
