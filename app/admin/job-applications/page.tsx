import { JobApplicationsPanel } from "@/components/admin/JobApplicationsPanel";

export default function JobApplicationsPage() {
  return (
    <div>
      <h1 className="font-condensed mb-10 text-2xl font-extrabold tracking-wide text-white uppercase">
        Job Applications
      </h1>
      <JobApplicationsPanel />
    </div>
  );
}
