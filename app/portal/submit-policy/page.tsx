import { auth } from "@/lib/auth";
import { SubmitPolicyPanel } from "@/components/portal/SubmitPolicyPanel";
import { PageHeading } from "@/components/portal/PageHeading";

export const dynamic = "force-dynamic";

export default async function SubmitPolicyPage() {
  const session = await auth();

  return (
    <div>
      <PageHeading slug="submit-policy" alt="Submit Policy" />
      <SubmitPolicyPanel isAgent={session?.user.role === "AGENT"} />
    </div>
  );
}
