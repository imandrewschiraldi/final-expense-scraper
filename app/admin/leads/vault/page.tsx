import { VaultAdminPanel } from "@/components/admin/VaultAdminPanel";

export const dynamic = "force-dynamic";

export default function VaultAdminPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold tracking-wide text-white uppercase">Vault</h1>
      <VaultAdminPanel />
    </div>
  );
}
