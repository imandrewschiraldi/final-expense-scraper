import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { checkAndAwardGoals } from "@/lib/personalDashboard";
import { resolveCommissionAmount } from "@/lib/commissionServer";
import { PolicyStatus } from "@prisma/client";

const POLICY_STATUSES: PolicyStatus[] = ["SUBMITTED", "ISSUED", "CHARGEBACK"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const existing = await db.policy.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Policy not found" }, { status: 404 });
  }
  if (guard.session.user.role !== "ADMIN" && existing.agentId !== guard.session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { clientName, clientPhone, state, carrier, product, annualPremium, status, carrierPlanId } = body as {
    clientName?: string;
    clientPhone?: string;
    state?: string;
    carrier?: string;
    product?: string;
    annualPremium?: number;
    status?: PolicyStatus;
    carrierPlanId?: string | null;
  };

  if (status !== undefined && !POLICY_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  // A changed AP or a newly-picked/cleared rate plan both mean the frozen
  // commission snapshot is stale and needs recomputing — a comp-level or
  // carrier-rate change alone does NOT, by design (see resolveCommissionAmount).
  const shouldRecomputeCommission = annualPremium !== undefined || carrierPlanId !== undefined;
  const commissionAmount = shouldRecomputeCommission
    ? await resolveCommissionAmount({
        agentId: existing.agentId,
        annualPremium: annualPremium !== undefined ? annualPremium : Number(existing.annualPremium),
        carrierPlanId: carrierPlanId !== undefined ? carrierPlanId : existing.carrierPlanId,
      })
    : undefined;

  const policy = await db.policy.update({
    where: { id },
    data: {
      ...(clientName !== undefined ? { clientName: clientName.trim() } : {}),
      ...(clientPhone !== undefined ? { clientPhone: clientPhone.trim() || null } : {}),
      ...(state !== undefined ? { state: state.trim().toUpperCase() || null } : {}),
      ...(carrier !== undefined ? { carrier: carrier.trim() } : {}),
      ...(product !== undefined ? { product: product.trim() || null } : {}),
      ...(annualPremium !== undefined ? { annualPremium } : {}),
      ...(carrierPlanId !== undefined ? { carrierPlanId } : {}),
      ...(shouldRecomputeCommission ? { commissionAmount } : {}),
      ...(status !== undefined
        ? {
            status,
            issuedAt: status === "ISSUED" ? (existing.issuedAt ?? new Date()) : existing.issuedAt,
          }
        : {}),
    },
  });

  if (status !== undefined && status !== existing.status) {
    await db.policyStatusHistory.create({
      data: { policyId: policy.id, fromStatus: existing.status, toStatus: status, changedById: guard.session.user.id },
    });
    if (policy.agentId) {
      await checkAndAwardGoals(policy.agentId);
    }
  }

  return NextResponse.json({ policy });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const existing = await db.policy.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Policy not found" }, { status: 404 });
  }
  if (guard.session.user.role !== "ADMIN" && existing.agentId !== guard.session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.policy.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
