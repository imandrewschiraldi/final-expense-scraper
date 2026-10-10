import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { JobApplicationsPanel } from "@/components/admin/JobApplicationsPanel";
import { PageHeading } from "@/components/portal/PageHeading";

export const dynamic = "force-dynamic";

export default async function JobApplicationsPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN" && session?.user.role !== "MANAGER") {
    redirect("/portal/dashboard");
  }

  return (
    <div>
      <PageHeading slug="job-applications" alt="Applications" />
      <JobApplicationsPanel />
    </div>
  );
}
