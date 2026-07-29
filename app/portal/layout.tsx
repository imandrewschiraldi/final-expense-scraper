import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PortalNav } from "@/components/portal/PortalNav";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background">
      <PortalNav role={session.user.role} name={session.user.name ?? ""} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
