import { auth } from "@/lib/auth";
import { CommissionCalculator } from "@/components/portal/CommissionCalculator";

export const dynamic = "force-dynamic";

export default async function CommissionCalculatorPage() {
  const session = await auth();

  return <CommissionCalculator agentName={session?.user.name ?? null} />;
}
