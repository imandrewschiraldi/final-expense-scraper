import { NextResponse } from "next/server";
import { requireAgent } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { agentHasVaultAccess } from "@/lib/vault";

export async function GET() {
  const guard = await requireAgent();
  if ("error" in guard) return guard.error;

  if (!(await agentHasVaultAccess(guard.session.user.id))) {
    return NextResponse.json({ error: "Vault access has expired for this agent" }, { status: 403 });
  }

  const grouped = await db.lead.groupBy({
    by: ["state"],
    where: { isVaulted: true },
    _count: { _all: true },
  });

  const states = grouped
    .map((g) => ({ state: g.state, count: g._count._all }))
    .sort((a, b) => a.state.localeCompare(b.state));

  return NextResponse.json({ states });
}
