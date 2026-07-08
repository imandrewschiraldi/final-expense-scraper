import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasVaultAccess } from "@/lib/vault";
import { VaultLeadList } from "@/components/agent/VaultLeadList";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

export default async function VaultPage() {
  const session = await auth();
  const agent = session?.user.id
    ? await db.user.findUnique({ where: { id: session.user.id }, select: { createdAt: true } })
    : null;

  if (!agent || !hasVaultAccess(agent.createdAt)) {
    redirect("/agent/dashboard");
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-extrabold tracking-wide text-white uppercase">Vault</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Vault Instructions</CardTitle>
        </CardHeader>
        <div className="space-y-3 text-sm text-muted">
          <p>
            The Vault is a shared lead source, open to every agent for their first eight (8) weeks. All agents
            draw from the same vault and are expected to work it accordingly.
          </p>
          <p>
            <span className="font-bold text-white">Every lead must be dispositioned when dialed.</span> A
            disposition is not optional — it is the price to access this vault.
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Leads marked <span className="font-semibold text-green-light">Sold</span> or{" "}
              <span className="font-semibold text-red-light">Not Interested</span> are removed from the vault
              immediately.</li>
            <li>Leads marked <span className="font-semibold text-white">Appointment Booked</span> that are not
              marked Sold within 14 days are automatically returned to the vault.</li>
          </ul>
          <p className="font-semibold text-white">
            This is a privilege, not a right. Any agent found contacting leads without dispositioning them
            will have their Vault access revoked.
          </p>
        </div>
      </Card>

      <VaultLeadList />
    </div>
  );
}
