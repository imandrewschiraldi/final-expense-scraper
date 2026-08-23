import { VaultAdminPanel } from "@/components/admin/VaultAdminPanel";
import { PageHeading } from "@/components/portal/PageHeading";

export const dynamic = "force-dynamic";

export default function VaultAdminPage() {
  return (
    <div>
      <PageHeading slug="lead-vault" alt="Lead Vault" />
      <VaultAdminPanel />
    </div>
  );
}
