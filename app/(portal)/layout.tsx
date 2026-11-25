import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getInitialSidebarProfile } from "@/lib/sidebarProfile";
import { AppShell } from "@/components/portal/AppShell";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  const initialSidebarProfile = await getInitialSidebarProfile(session.user.id);

  return (
    <AppShell
      role={session.user.role}
      name={session.user.name ?? ""}
      initialSidebarProfile={initialSidebarProfile}
    >
      {children}
    </AppShell>
  );
}
