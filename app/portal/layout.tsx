import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar, HEADER_HEIGHT } from "@/components/portal/Sidebar";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={session.user.role} name={session.user.name ?? ""} />
      <main className="relative min-w-0 flex-1 overflow-y-auto px-6 pt-2 pb-8 lg:px-10">
        {/* Continues the sidebar header's copper line across the content
            area, at the same height. Lives inside the scrollable region
            (not viewport-fixed) so it scrolls away with the rest of the
            page instead of staying pinned over content that's scrolled
            underneath it. */}
        <div className="pointer-events-none absolute inset-x-0 -mx-6 h-0.5 bg-copper lg:-mx-10" style={{ top: HEADER_HEIGHT }} />
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
