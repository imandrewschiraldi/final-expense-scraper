import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { HierarchyAdminPanel } from "@/components/portal/HierarchyAdminPanel";
import { HierarchyManagerPanel } from "@/components/portal/HierarchyManagerPanel";

export const dynamic = "force-dynamic";

export default async function HierarchyPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN" && session?.user.role !== "MANAGER") {
    redirect("/portal/dashboard");
  }

  return (
    <div>
      <h1 className="mb-10 text-2xl font-extrabold tracking-wide text-white uppercase">Hierarchy</h1>
      {session.user.role === "ADMIN" ? <HierarchyAdminPanel /> : <HierarchyManagerPanel />}
    </div>
  );
}
