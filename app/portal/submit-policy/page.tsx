import { auth } from "@/lib/auth";
import { SubmitPolicyPanel } from "@/components/portal/SubmitPolicyPanel";

export const dynamic = "force-dynamic";

export default async function SubmitPolicyPage() {
  const session = await auth();

  return (
    <div>
      <h1 className="mb-10 text-2xl font-extrabold tracking-wide text-white uppercase">Submit Policy</h1>
      <SubmitPolicyPanel isAgent={session?.user.role === "AGENT"} />
    </div>
  );
}
