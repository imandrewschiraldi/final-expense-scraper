import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { HierarchyAdminPanel } from "@/components/portal/HierarchyAdminPanel";
import { HierarchyManagerPanel } from "@/components/portal/HierarchyManagerPanel";
import { PageHeading } from "@/components/portal/PageHeading";

export const dynamic = "force-dynamic";

export default async function HierarchyPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN" && session?.user.role !== "MANAGER") {
    redirect("/portal/dashboard");
  }

  return (
    <div>
      <PageHeading slug="hierarchy" alt="Hierarchy" />
      {session.user.role === "ADMIN" ? <HierarchyAdminPanel /> : <HierarchyManagerPanel />}
    </div>
  );
}
