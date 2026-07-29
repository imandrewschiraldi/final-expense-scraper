import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ResourcesPanel } from "@/components/portal/ResourcesPanel";

export const dynamic = "force-dynamic";

export default async function PortalResourcesPage() {
  const session = await auth();
  const resources = await db.resource.findMany({
    orderBy: { createdAt: "desc" },
    include: { uploadedBy: { select: { name: true } } },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold tracking-wide text-white uppercase">Resources</h1>
      <ResourcesPanel
        initialResources={resources.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))}
        isAdmin={session?.user.role === "ADMIN"}
      />
    </div>
  );
}
