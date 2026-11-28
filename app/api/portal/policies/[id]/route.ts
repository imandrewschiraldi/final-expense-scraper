import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { checkAndAwardGoals } from "@/lib/personalDashboard";
import { resolveCommissionAmount } from "@/lib/commissionServer";
import { stageIdForSystemKey, getStageTarget } from "@/lib/pipelineSync";
import { removeFollowUpEvent, upsertFollowUpEvent } from "@/lib/calendarEvents";
import { PolicyLine, PolicyStatus } from "@prisma/client";

const POLICY_STATUSES: PolicyStatus[] = ["SUBMITTED", "ISSUED", "CHARGEBACK"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const existing = await db.policy.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Policy not found" }, { status: 404 });
  }
  if (
    guard.session.user.role !== "ADMIN" &&
    existing.agentId !== guard.session.user.id
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const {
    clientName,
    clientPhone,
    state,
    carrier,
    product,
    line,
    annualPremium,
    monthlyPremium,
    policyNumber,
    effectiveDate,
    beneficiaryName,
    beneficiaryRelationship,
    status,
    pipelineStageId,
    carrierPlanId,
    notes,
    followUpAt,
  } = body as {
    clientName?: string;
    clientPhone?: string | null;
    state?: string | null;
    carrier?: string;
    product?: string | null;
    line?: PolicyLine;
    annualPremium?: number;
    monthlyPremium?: number | null;
    policyNumber?: string | null;
    effectiveDate?: string | null;
    beneficiaryName?: string | null;
    beneficiaryRelationship?: string | null;
    status?: PolicyStatus;
    pipelineStageId?: string;
    carrierPlanId?: string | null;
    notes?: string | null;
    followUpAt?: string | null;
  };

  let parsedEffectiveDate: Date | null | undefined;
  if (effectiveDate !== undefined) {
    if (effectiveDate === null || effectiveDate === "") {
      parsedEffectiveDate = null;
    } else {
      const parsed = new Date(effectiveDate);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json(
          { error: "Invalid effective date" },
          { status: 400 },
        );
      }
      parsedEffectiveDate = parsed;
    }
  }

  let parsedFollowUpAt: Date | null | undefined;
  if (followUpAt !== undefined) {
    if (followUpAt === null || followUpAt === "") {
      parsedFollowUpAt = null;
    } else {
      const parsed = new Date(followUpAt);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json(
          { error: "Invalid follow-up date" },
          { status: 400 },
        );
      }
      parsedFollowUpAt = parsed;
    }
  }

  if (status !== undefined && !POLICY_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  if (status !== undefined && pipelineStageId !== undefined) {
    return NextResponse.json(
      { error: "Provide either status or pipelineStageId, not both" },
      { status: 400 },
    );
  }

  // The status this update resolves to — whichever of `status` or
  // `pipelineStageId` the caller sent, both stay in lockstep below so
  // issuedAt/status history are identical no matter which field drove the
  // change. A stage with no legacy systemKey (e.g. "Lapsed") only moves
  // pipelineStageId and leaves status untouched.
  let effectiveStatus: PolicyStatus | undefined = status;
  let syncedStageId: string | undefined;
  if (status !== undefined) {
    syncedStageId = (await stageIdForSystemKey("CLIENT", status)) ?? undefined;
  } else if (pipelineStageId !== undefined) {
    const target = await getStageTarget(pipelineStageId);
    if (!target || target.phase !== "CLIENT") {
      return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
    }
    syncedStageId = pipelineStageId;
    if (target.systemKey) effectiveStatus = target.systemKey as PolicyStatus;
  }

  // A changed AP or a newly-picked/cleared rate plan both mean the frozen
  // commission snapshot is stale and needs recomputing — a comp-level or
  // carrier-rate change alone does NOT, by design (see resolveCommissionAmount).
  const shouldRecomputeCommission =
    annualPremium !== undefined || carrierPlanId !== undefined;
  const commissionAmount = shouldRecomputeCommission
    ? await resolveCommissionAmount({
        agentId: existing.agentId,
        annualPremium:
          annualPremium !== undefined
            ? annualPremium
            : Number(existing.annualPremium),
        carrierPlanId:
          carrierPlanId !== undefined ? carrierPlanId : existing.carrierPlanId,
      })
    : undefined;

  const policy = await db.policy.update({
    where: { id },
    data: {
      ...(clientName !== undefined ? { clientName: clientName.trim() } : {}),
      ...(clientPhone !== undefined
        ? { clientPhone: clientPhone?.trim() || null }
        : {}),
      ...(state !== undefined
        ? { state: state?.trim().toUpperCase() || null }
        : {}),
      ...(carrier !== undefined ? { carrier: carrier.trim() } : {}),
      ...(product !== undefined ? { product: product?.trim() || null } : {}),
      ...(line !== undefined ? { line } : {}),
      ...(annualPremium !== undefined ? { annualPremium } : {}),
      ...(monthlyPremium !== undefined ? { monthlyPremium } : {}),
      ...(policyNumber !== undefined
        ? { policyNumber: policyNumber?.trim() || null }
        : {}),
      ...(parsedEffectiveDate !== undefined
        ? { effectiveDate: parsedEffectiveDate }
        : {}),
      ...(beneficiaryName !== undefined
        ? { beneficiaryName: beneficiaryName?.trim() || null }
        : {}),
      ...(beneficiaryRelationship !== undefined
        ? { beneficiaryRelationship: beneficiaryRelationship?.trim() || null }
        : {}),
      ...(carrierPlanId !== undefined ? { carrierPlanId } : {}),
      ...(shouldRecomputeCommission ? { commissionAmount } : {}),
      ...(syncedStageId !== undefined
        ? { pipelineStageId: syncedStageId }
        : {}),
      ...(notes !== undefined ? { notes: notes?.trim() || null } : {}),
      ...(parsedFollowUpAt !== undefined
        ? { followUpAt: parsedFollowUpAt }
        : {}),
      ...(effectiveStatus !== undefined
        ? {
            status: effectiveStatus,
            issuedAt:
              effectiveStatus === "ISSUED"
                ? (existing.issuedAt ?? new Date())
                : existing.issuedAt,
          }
        : {}),
    },
  });

  if (effectiveStatus !== undefined && effectiveStatus !== existing.status) {
    await db.policyStatusHistory.create({
      data: {
        policyId: policy.id,
        fromStatus: existing.status,
        toStatus: effectiveStatus,
        changedById: guard.session.user.id,
      },
    });
    if (policy.agentId) {
      await checkAndAwardGoals(policy.agentId);
    }
  }

  // Mirrors followUpAt onto the owning agent's calendar — set shows it as a
  // reminder there, cleared removes whatever reminder was already showing.
  if (parsedFollowUpAt !== undefined && policy.agentId) {
    if (parsedFollowUpAt) {
      await upsertFollowUpEvent({
        ownerId: policy.agentId,
        policyId: policy.id,
        clientName: policy.clientName,
        followUpAt: parsedFollowUpAt,
      });
    } else {
      await removeFollowUpEvent(policy.id);
    }
  }

  return NextResponse.json({ policy });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const existing = await db.policy.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Policy not found" }, { status: 404 });
  }
  if (
    guard.session.user.role !== "ADMIN" &&
    existing.agentId !== guard.session.user.id
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.policy.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
