import { VaultLeadList } from "@/components/agent/VaultLeadList";

export const dynamic = "force-dynamic";

export default function VaultPage() {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-extrabold tracking-wide text-white uppercase">Vault</h1>
      <p className="mb-6 text-sm text-muted">
        A shared pool of leads any agent can call. Marking one Appointment Booked, Not Interested, or Sold
        claims it for you and removes it from the shared pool.
      </p>
      <VaultLeadList />
    </div>
  );
}
