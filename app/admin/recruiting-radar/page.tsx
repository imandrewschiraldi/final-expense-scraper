import { RecruitingRadarPanel } from "@/components/admin/RecruitingRadarPanel";
import { PageHeading } from "@/components/portal/PageHeading";

export default function RecruitingRadarPage() {
  return (
    <div>
      <PageHeading slug="recruiting-radar" alt="Recruiting Radar" />
      <RecruitingRadarPanel />
    </div>
  );
}
