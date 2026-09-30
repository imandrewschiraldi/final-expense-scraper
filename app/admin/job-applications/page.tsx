import { JobApplicationsPanel } from "@/components/admin/JobApplicationsPanel";
import { PageHeading } from "@/components/portal/PageHeading";

export default function JobApplicationsPage() {
  return (
    <div>
      <PageHeading slug="job-applications" alt="Applications" />
      <JobApplicationsPanel />
    </div>
  );
}
