import { NextRequest, NextResponse } from "next/server";
import { requireAgent } from "@/lib/apiAuth";
import { db } from "@/lib/db";

// Real-time duplicate check for the Add/Edit Contact form — fired on blur of
// the email or phone input. Scoped to the agent's own leads (and their
// secondary emails/phones), same as everything else on the Contacts page;
// an agent only ever needs to know "do I already have this person", not
// whether another agent does.
export async function GET(req: NextRequest) {
  const guard = await requireAgent();
  if ("error" in guard) return guard.error;
  const agentId = guard.session.user.id;

  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email")?.trim().toLowerCase() || "";
  const phoneDigits = (searchParams.get("phone") || "").replace(/[^\d]/g, "");
  const excludeId = searchParams.get("excludeId") || undefined;

  if (!email && phoneDigits.length < 10) {
    return NextResponse.json({ match: null });
  }

  const match = await db.lead.findFirst({
    where: {
      assignedAgentId: agentId,
      id: excludeId ? { not: excludeId } : undefined,
      OR: [
        ...(email
          ? [
              { email: { equals: email, mode: "insensitive" as const } },
              { secondaryEmails: { some: { value: { equals: email, mode: "insensitive" as const } } } },
            ]
          : []),
        ...(phoneDigits.length >= 10
          ? [
              { phone: { contains: phoneDigits } },
              { secondaryPhones: { some: { value: { contains: phoneDigits } } } },
            ]
          : []),
      ],
    },
    select: { id: true, firstName: true, lastName: true, email: true, phone: true },
  });

  return NextResponse.json({ match });
}
