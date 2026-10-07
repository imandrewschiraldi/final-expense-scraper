import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { RecruitingRadarPanel } from "@/components/admin/RecruitingRadarPanel";
import { PageHeading } from "@/components/portal/PageHeading";

export const dynamic = "force-dynamic";

export default async function RecruitingRadarPage() {
  const session = await auth();
  const isAdmin = session?.user.role === "ADMIN";

  if (!isAdmin) {
    const user = session?.user.id
      ? await db.user.findUnique({ where: { id: session.user.id }, select: { recruitingRadarEnabled: true } })
      : null;
    if (!user?.recruitingRadarEnabled) {
      redirect("/portal/dashboard");
    }
  }

  return (
    <div>
      <PageHeading slug="recruiting-radar" alt="Recruiting Radar" />
      <RecruitingRadarPanel isAdmin={isAdmin} />
    </div>
  );
}
