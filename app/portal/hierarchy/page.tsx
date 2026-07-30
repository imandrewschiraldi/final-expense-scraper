import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ComingSoon } from "@/components/portal/ComingSoon";

export const dynamic = "force-dynamic";

export default async function HierarchyPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN" && session?.user.role !== "MANAGER") {
    redirect("/portal/dashboard");
  }

  return (
    <ComingSoon
      title="Hierarchy"
      description="Manage reporting relationships across the organization — admins assign managers and agents, managers can request changes for admin approval, and every manager sees their assigned downline's production."
    />
  );
}
