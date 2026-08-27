import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { checkAndAwardGoals } from "@/lib/personalDashboard";
import { postDailySaleAnnouncement } from "@/lib/chatBot";
import { PolicyStatus } from "@prisma/client";

const POLICY_STATUSES: PolicyStatus[] = ["SUBMITTED", "ISSUED", "CHARGEBACK"];

export async function GET(req: NextRequest) {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  const { searchParams } = new URL(req.url);
  const mine = searchParams.get("mine") === "true";

  const policies = await db.policy.findMany({
    where: mine || guard.session.user.role === "AGENT" ? { agentId: guard.session.user.id } : {},
    orderBy: { submittedAt: "desc" },
    include: { agent: { select: { name: true } } },
  });

  return NextResponse.json({ policies });
}

export async function POST(req: NextRequest) {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  const body = await req.json();
  const { leadId, clientName, clientPhone, state, carrier, product, annualPremium, status } = body as {
    leadId?: string;
    clientName?: string;
    clientPhone?: string;
    state?: string;
    carrier?: string;
    product?: string;
    annualPremium?: number;
    status?: PolicyStatus;
  };

  if (!clientName?.trim() || !carrier?.trim() || !annualPremium || annualPremium <= 0) {
    return NextResponse.json(
      { error: "Client name, carrier, and a positive annual premium are required" },
      { status: 400 },
    );
  }

  let lead = null;
  if (leadId) {
    lead = await db.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
  }

  const now = new Date();
  const resolvedStatus = status && POLICY_STATUSES.includes(status) ? status : "SUBMITTED";
  const policy = await db.policy.create({
    data: {
      agentId: guard.session.user.id,
      leadId: leadId ?? null,
      clientName: clientName.trim(),
      clientPhone: clientPhone?.trim() || lead?.phone || null,
      state: state?.trim().toUpperCase() || lead?.state || null,
      carrier: carrier.trim(),
      product: product?.trim() || null,
      annualPremium,
      status: resolvedStatus,
      issuedAt: resolvedStatus === "ISSUED" ? now : null,
    },
  });

  await db.policyStatusHistory.create({
    data: { policyId: policy.id, fromStatus: null, toStatus: resolvedStatus, changedById: guard.session.user.id },
  });
  if (guard.session.user.id) {
    await checkAndAwardGoals(guard.session.user.id);
  }

  await postDailySaleAnnouncement({
    agentName: guard.session.user.name ?? guard.session.user.email ?? "An agent",
    annualPremium,
    carrier: carrier.trim(),
  });

  return NextResponse.json({ policy }, { status: 201 });
}
