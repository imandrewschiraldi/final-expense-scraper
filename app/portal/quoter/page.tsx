import { QuoterTool } from "@/components/portal/QuoterTool";
import { PageHeading } from "@/components/portal/PageHeading";

export default function QuoterPage() {
  return (
    <div>
      <PageHeading slug="quote-tool" alt="Quote Tool" />
      <QuoterTool />
    </div>
  );
}
