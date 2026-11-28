import { NextRequest, NextResponse } from "next/server";
import { requireAgent } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { LEAD_STATUSES, LeadStatus } from "@/lib/leadStatus";
import { isLeadType, TOBACCO_STATUSES, COVERAGE_GOAL_BUCKETS } from "@/lib/leadType";
import {
  computeVaultAwareStatusUpdate,
  agentHasVaultAccess,
  shouldLogContact,
} from "@/lib/vault";
import { stageIdForSystemKey, getStageTarget } from "@/lib/pipelineSync";
import { Prisma, PhoneType } from "@prisma/client";
import { colorForTagName } from "@/app/api/agent/tag-colors/route";

// Client Suitability Sheet fields added beyond the original five — plain
// string fields that just trim-or-null, no field-specific validation (see
// each one's own schema.prisma doc comment for what it is). Handled
// generically rather than one-by-one since there are ~30 of them.
const SUITABILITY_STRING_FIELDS = [
  "client1Surgeries",
  "client2FirstName",
  "client2LastName",
  "client2Occupation",
  "client2Height",
  "client2Weight",
  "client2Surgeries",
  "client2Medications",
  "significantOther",
  "additionalIncome",
  "dependents",
  "monthlyLeftover",
  "mortgageTerm",
  "mortgagePurchaseType",
  "homeValue",
  "homeEquity",
  "rentOrMortgagePayment",
  "howLongWillStay",
  "lifeInsuranceSource",
  "lifeInsuranceType",
  "lifeInsuranceCompany",
  "lifeInsuranceFaceAmount",
  "lifeInsuranceMonthly",
  "lifeInsuranceSince",
  "recurringDraftDay",
  "bronzeFaceAmount",
  "bronzeMonthly",
  "silverFaceAmount",
  "silverMonthly",
  "goldFaceAmount",
  "goldMonthly",
  "bankName",
  "bankRoutingNumber",
  "bankAccountNumber",
  "ssn",
  "driversLicenseNumber",
  "driversLicenseState",
] as const;

const SUITABILITY_BOOLEAN_FIELDS = [
  "client1Bankruptcy",
  "client1DuiFelony",
  "client2Smoker",
  "client2Bankruptcy",
  "client2DuiFelony",
  "isForeverHome",
  "hasLifeInsurance",
] as const;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAgent();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const agentId = guard.session.user.id;
  const canAccessVault = await agentHasVaultAccess(agentId);
  const or: Prisma.LeadWhereInput[] = [{ assignedAgentId: agentId }];
  if (canAccessVault) or.push({ isVaulted: true });

  const lead = await db.lead.findFirst({
    where: { id, OR: or },
    include: {
      notes: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { name: true } } },
      },
      contactLogEntries: {
        orderBy: { createdAt: "desc" },
        include: { agent: { select: { name: true } } },
      },
      pipelineStage: { select: { id: true, name: true, systemKey: true } },
      secondaryEmails: { orderBy: { createdAt: "asc" } },
      secondaryPhones: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  return NextResponse.json({ lead });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAgent();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const body = await req.json();
  const {
    status,
    pipelineStageId,
    firstName,
    lastName,
    phone,
    email,
    state,
    dateOfBirth,
    leadType,
    income,
    existingCoverage,
    coverageAmountRequested,
    coverageGoalBucket,
    monthlyBudget,
    height,
    weight,
    tobaccoUse,
    tobaccoStatus,
    medicalNotes,
    healthConditions,
    tags,
    source,
    dndAll,
    dndChannels,
    secondaryEmails,
    secondaryPhones,
  } = body as {
    status?: LeadStatus;
    pipelineStageId?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string | null;
    state?: string;
    dateOfBirth?: string;
    leadType?: string;
    // The Client Suitability Sheet (lib/f90Content.ts's P3_S2 step) — an
    // agent captures these live, on the lead's own detail page, while
    // actually on the call with them.
    income?: string;
    existingCoverage?: string;
    coverageAmountRequested?: string;
    // "TEN_TO_25K" | "FIFTY_TO_100K" | "250K_PLUS" — see its own schema doc comment.
    coverageGoalBucket?: string | null;
    monthlyBudget?: string;
    height?: string;
    weight?: string;
    tobaccoUse?: boolean | null;
    // "YES" | "NO" | "QUIT_12_MONTHS_PLUS" — see its own schema doc comment.
    tobaccoStatus?: string | null;
    medicalNotes?: string;
    // Major Health Conditions checklist — full replacement list, same
    // reasoning as secondaryEmails/secondaryPhones below.
    healthConditions?: string[];
    // Contacts page additions — tags (bulk or per-contact) and the
    // free-text acquisition source.
    tags?: string[];
    source?: string | null;
    dndAll?: boolean;
    dndChannels?: Record<string, boolean> | null;
    // Full replacement lists — the Add/Edit Contact form always sends its
    // whole "+ Add Email/Phone" row set, never a single row to patch, so
    // this replaces rather than merges (see the write below).
    secondaryEmails?: string[];
    secondaryPhones?: { value: string; type?: string; countryCode?: string }[];
  };

  // The rest of the Client Suitability Sheet expansion — too many fields to
  // destructure one-by-one, handled generically below (see
  // SUITABILITY_STRING_FIELDS/SUITABILITY_BOOLEAN_FIELDS).
  const rawBody = body as Record<string, unknown>;
  const client2Age = rawBody.client2Age as number | null | undefined;
  const client2DateOfBirth = rawBody.client2DateOfBirth as string | null | undefined;
  const coverageEffectiveDate = rawBody.coverageEffectiveDate as string | null | undefined;
  const liquidAssets = rawBody.liquidAssets as string[] | undefined;
  const hasSuitabilityExpansionEdit =
    SUITABILITY_STRING_FIELDS.some((f) => rawBody[f] !== undefined) ||
    SUITABILITY_BOOLEAN_FIELDS.some((f) => rawBody[f] !== undefined) ||
    client2Age !== undefined ||
    client2DateOfBirth !== undefined ||
    coverageEffectiveDate !== undefined ||
    liquidAssets !== undefined;

  const isFieldEdit =
    hasSuitabilityExpansionEdit ||
    firstName !== undefined ||
    lastName !== undefined ||
    phone !== undefined ||
    email !== undefined ||
    state !== undefined ||
    dateOfBirth !== undefined ||
    leadType !== undefined ||
    income !== undefined ||
    existingCoverage !== undefined ||
    coverageAmountRequested !== undefined ||
    coverageGoalBucket !== undefined ||
    monthlyBudget !== undefined ||
    height !== undefined ||
    weight !== undefined ||
    tobaccoUse !== undefined ||
    tobaccoStatus !== undefined ||
    medicalNotes !== undefined ||
    healthConditions !== undefined ||
    tags !== undefined ||
    source !== undefined ||
    dndAll !== undefined ||
    dndChannels !== undefined ||
    secondaryEmails !== undefined ||
    secondaryPhones !== undefined;

  if (status !== undefined && !LEAD_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  if (leadType !== undefined && !isLeadType(leadType)) {
    return NextResponse.json({ error: "Invalid lead type" }, { status: 400 });
  }
  if (
    tobaccoStatus !== undefined &&
    tobaccoStatus !== null &&
    !(TOBACCO_STATUSES as readonly string[]).includes(tobaccoStatus)
  ) {
    return NextResponse.json({ error: "Invalid tobacco status" }, { status: 400 });
  }
  if (
    coverageGoalBucket !== undefined &&
    coverageGoalBucket !== null &&
    !(COVERAGE_GOAL_BUCKETS as readonly string[]).includes(coverageGoalBucket)
  ) {
    return NextResponse.json({ error: "Invalid coverage goal bucket" }, { status: 400 });
  }
  if (status !== undefined && pipelineStageId !== undefined) {
    return NextResponse.json(
      { error: "Provide either status or pipelineStageId, not both" },
      { status: 400 },
    );
  }
  if (status === undefined && pipelineStageId === undefined && !isFieldEdit) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const agentId = guard.session.user.id;
  const canAccessVault = await agentHasVaultAccess(agentId);
  const or: Prisma.LeadWhereInput[] = [{ assignedAgentId: agentId }];
  if (canAccessVault) or.push({ isVaulted: true });

  const lead = await db.lead.findFirst({ where: { id, OR: or } });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  if (lead.isArchived) {
    return NextResponse.json(
      { error: "This lead is locked and can no longer be updated" },
      { status: 423 },
    );
  }

  // Editing lead details (as opposed to just changing status) is only
  // allowed on leads already assigned to this agent — never on a shared
  // Vault lead they haven't claimed yet.
  if (isFieldEdit && lead.assignedAgentId !== agentId) {
    return NextResponse.json(
      { error: "You can only edit details on leads assigned to you" },
      { status: 403 },
    );
  }

  const editData: Prisma.LeadUncheckedUpdateManyInput = {};
  if (isFieldEdit) {
    if (firstName !== undefined) {
      const trimmed = firstName.trim();
      if (!trimmed)
        return NextResponse.json(
          { error: "First name is required" },
          { status: 400 },
        );
      editData.firstName = trimmed;
    }
    if (lastName !== undefined) editData.lastName = lastName.trim();
    if (phone !== undefined) {
      const normalized = phone.replace(/[^\d+]/g, "");
      if (normalized.length < 10) {
        return NextResponse.json(
          { error: "A valid phone number is required" },
          { status: 400 },
        );
      }
      editData.phone = normalized;
    }
    if (state !== undefined) {
      const trimmed = state.trim().toUpperCase();
      if (!trimmed)
        return NextResponse.json(
          { error: "State is required" },
          { status: 400 },
        );
      editData.state = trimmed;
    }
    if (dateOfBirth !== undefined) {
      if (!dateOfBirth.trim()) {
        // Date of birth is optional — an empty value clears it.
        editData.dateOfBirth = null;
      } else {
        const parsed = new Date(dateOfBirth);
        if (Number.isNaN(parsed.getTime())) {
          return NextResponse.json(
            { error: "Invalid date of birth" },
            { status: 400 },
          );
        }
        editData.dateOfBirth = parsed;
      }
    }
    // Book of Business's "Add Opportunity" moving an existing contact into
    // a different product pipeline — a Lead only ever belongs to one at a
    // time today, so this reassigns rather than adds a second membership.
    if (leadType !== undefined) editData.leadType = leadType;
    // Client Suitability Sheet fields — a blank string clears the field,
    // same as dateOfBirth above, rather than being rejected as invalid.
    if (income !== undefined) editData.income = income.trim() || null;
    if (existingCoverage !== undefined)
      editData.existingCoverage = existingCoverage.trim() || null;
    if (coverageAmountRequested !== undefined)
      editData.coverageAmountRequested = coverageAmountRequested.trim() || null;
    if (coverageGoalBucket !== undefined) editData.coverageGoalBucket = coverageGoalBucket;
    if (monthlyBudget !== undefined) editData.monthlyBudget = monthlyBudget.trim() || null;
    if (height !== undefined) editData.height = height.trim() || null;
    if (weight !== undefined) editData.weight = weight.trim() || null;
    if (tobaccoUse !== undefined) editData.tobaccoUse = tobaccoUse;
    if (tobaccoStatus !== undefined) {
      editData.tobaccoStatus = tobaccoStatus;
      editData.tobaccoUse = tobaccoStatus === "YES";
    }
    if (medicalNotes !== undefined)
      editData.medicalNotes = medicalNotes.trim() || null;
    if (healthConditions !== undefined) editData.healthConditions = healthConditions;
    if (tags !== undefined) editData.tags = tags;
    if (source !== undefined) editData.source = source?.trim() || null;
    if (email !== undefined) {
      const trimmed = email?.trim() || "";
      if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
      }
      editData.email = trimmed || null;
    }
    if (dndAll !== undefined) editData.dndAll = dndAll;
    if (dndChannels !== undefined) editData.dndChannels = dndChannels ?? Prisma.JsonNull;

    // The rest of the Client Suitability Sheet expansion (Client 2,
    // Income & Budget, Mortgage Protection, Existing Coverage, 3 Coverage
    // Options, Golden Info) — generic pass-through, blank string clears.
    const editDataRecord = editData as unknown as Record<string, unknown>;
    for (const f of SUITABILITY_STRING_FIELDS) {
      if (rawBody[f] === undefined) continue;
      const v = rawBody[f];
      editDataRecord[f] = typeof v === "string" ? v.trim() || null : null;
    }
    for (const f of SUITABILITY_BOOLEAN_FIELDS) {
      if (rawBody[f] !== undefined) editDataRecord[f] = rawBody[f];
    }
    if (client2Age !== undefined) editData.client2Age = client2Age;
    if (client2DateOfBirth !== undefined) {
      if (!client2DateOfBirth) {
        editData.client2DateOfBirth = null;
      } else {
        const parsed = new Date(client2DateOfBirth);
        if (Number.isNaN(parsed.getTime())) {
          return NextResponse.json(
            { error: "Invalid Client 2 date of birth" },
            { status: 400 },
          );
        }
        editData.client2DateOfBirth = parsed;
      }
    }
    if (coverageEffectiveDate !== undefined) {
      if (!coverageEffectiveDate) {
        editData.coverageEffectiveDate = null;
      } else {
        const parsed = new Date(coverageEffectiveDate);
        if (Number.isNaN(parsed.getTime())) {
          return NextResponse.json(
            { error: "Invalid coverage effective date" },
            { status: 400 },
          );
        }
        editData.coverageEffectiveDate = parsed;
      }
    }
    if (liquidAssets !== undefined) editData.liquidAssets = liquidAssets;
  }

  // New tag names get a stable color the first time they're used — a no-op
  // upsert for tags that already have one.
  if (tags !== undefined && tags.length > 0) {
    await db.tagColor.createMany({
      data: tags.map((name) => ({ name, color: colorForTagName(name) })),
      skipDuplicates: true,
    });
  }

  // The status this update resolves to for vault/contact-log purposes —
  // whichever of `status` or `pipelineStageId` the caller sent, the two stay
  // in lockstep below so the side effects (vault exit, contact log,
  // isArchived) are identical no matter which field drove the change.
  let effectiveStatus: LeadStatus | undefined;
  let statusData: Prisma.LeadUncheckedUpdateManyInput = {};

  if (status !== undefined) {
    effectiveStatus = status;
    statusData = computeVaultAwareStatusUpdate(status, lead, agentId);
    const syncedStageId = await stageIdForSystemKey("LEAD", status);
    if (syncedStageId) statusData.pipelineStageId = syncedStageId;
  } else if (pipelineStageId !== undefined) {
    const target = await getStageTarget(pipelineStageId);
    if (!target || target.phase !== "LEAD") {
      return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
    }
    statusData.pipelineStageId = pipelineStageId;
    if (target.systemKey) {
      effectiveStatus = target.systemKey as LeadStatus;
      statusData = {
        ...statusData,
        ...computeVaultAwareStatusUpdate(effectiveStatus, lead, agentId),
      };
    }
  }

  const data: Prisma.LeadUncheckedUpdateManyInput = {
    ...editData,
    ...statusData,
  };

  // Use updateMany with the same ownership/vault condition as the read
  // above so that if another agent claims this vault lead in between, this
  // update simply matches zero rows instead of overwriting their claim.
  const result = await db.lead.updateMany({
    where: { id, OR: or },
    data,
  });

  if (result.count === 0) {
    return NextResponse.json(
      { error: "This lead was just claimed by another agent" },
      { status: 409 },
    );
  }

  if (effectiveStatus !== undefined && shouldLogContact(effectiveStatus)) {
    await db.contactLogEntry.create({
      data: { leadId: id, agentId, status: effectiveStatus },
    });
  }

  // Full replacement of the secondary email/phone lists — see this route's
  // own type comment above on why these always arrive as the whole set
  // rather than a single row to patch.
  if (secondaryEmails !== undefined || secondaryPhones !== undefined) {
    await db.$transaction([
      ...(secondaryEmails !== undefined
        ? [
            db.leadEmail.deleteMany({ where: { leadId: id } }),
            db.leadEmail.createMany({
              data: secondaryEmails
                .map((v) => v.trim())
                .filter(Boolean)
                .map((value) => ({ leadId: id, value })),
            }),
          ]
        : []),
      ...(secondaryPhones !== undefined
        ? [
            db.leadPhone.deleteMany({ where: { leadId: id } }),
            db.leadPhone.createMany({
              data: secondaryPhones
                .filter((p) => p.value?.trim())
                .map((p) => ({
                  leadId: id,
                  value: p.value.replace(/[^\d+]/g, ""),
                  type: (Object.values(PhoneType) as string[]).includes(p.type ?? "")
                    ? (p.type as PhoneType)
                    : PhoneType.MOBILE,
                  countryCode: p.countryCode || "+1",
                })),
            }),
          ]
        : []),
    ]);
  }

  const updated = await db.lead.findUniqueOrThrow({
    where: { id },
    include: {
      notes: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { name: true } } },
      },
      contactLogEntries: {
        orderBy: { createdAt: "desc" },
        include: { agent: { select: { name: true } } },
      },
      pipelineStage: { select: { id: true, name: true, systemKey: true } },
      secondaryEmails: { orderBy: { createdAt: "asc" } },
      secondaryPhones: { orderBy: { createdAt: "asc" } },
    },
  });

  return NextResponse.json({ lead: updated });
}

/**
 * An agent can only delete a lead they personally imported themselves
 * (tracked via Lead.sourceImport.uploadedById) — never a lead that reached
 * their book through normal admin assignment or the shared vault, even
 * though both look identical in "My Leads" otherwise.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAgent();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const agentId = guard.session.user.id;

  const lead = await db.lead.findUnique({
    where: { id },
    select: {
      assignedAgentId: true,
      isArchived: true,
      sourceImport: { select: { uploadedById: true } },
    },
  });

  if (!lead || lead.assignedAgentId !== agentId) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  if (lead.sourceImport?.uploadedById !== agentId) {
    return NextResponse.json(
      { error: "You can only delete leads you imported yourself" },
      { status: 403 },
    );
  }

  if (lead.isArchived) {
    return NextResponse.json(
      { error: "This lead is locked and can no longer be deleted" },
      { status: 423 },
    );
  }

  await db.lead.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
