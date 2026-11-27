import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { Prisma, type LeadStatus, type PolicyStatus } from "@prisma/client";
import { SEED_STAGES } from "@/lib/pipelineStages";

// One-time (but safe to re-run) setup for the Opportunity pipeline feature:
// creates every stage in SEED_STAGES if it doesn't already exist, then
// backfills every existing Lead/Policy's pipelineStageId from its current
// status, and every Policy's leadType from its linked Lead. Only ever
// touches rows that don't already have a pipelineStageId/leadType set, so
// re-running it (or running it again after an admin starts moving cards
// around) never clobbers anything already in motion.
//
// A policy submitted with no linked Lead has no leadType to copy from —
// confirmed with the account owner that every historical policy like this,
// across every agent, was Veterans Final Expense, so those are defaulted
// to it explicitly below rather than left permanently invisible in every
// Client pipeline. Going forward this gap is closed at submit time instead
// (PolicySubmitForm now requires picking a pipeline for a manual entry).
export const maxDuration = 300;

export async function POST() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const stageIds: Record<string, string> = {}; // keyed by `${phase}:${systemKey ?? name}`

  for (const seed of SEED_STAGES) {
    const key = `${seed.phase}:${seed.systemKey ?? seed.name}`;
    if (seed.systemKey) {
      const stage = await db.pipelineStage.upsert({
        where: {
          phase_systemKey: { phase: seed.phase, systemKey: seed.systemKey },
        },
        update: {},
        create: seed,
      });
      stageIds[key] = stage.id;
    } else {
      const existing = await db.pipelineStage.findFirst({
        where: { phase: seed.phase, name: seed.name, systemKey: null },
      });
      const stage = existing ?? (await db.pipelineStage.create({ data: seed }));
      stageIds[key] = stage.id;
    }
  }

  const leadStatusSeeds = SEED_STAGES.filter(
    (s) => s.phase === "LEAD" && s.systemKey,
  );
  for (const seed of leadStatusSeeds) {
    await db.lead.updateMany({
      where: { status: seed.systemKey as LeadStatus, pipelineStageId: null },
      data: { pipelineStageId: stageIds[`LEAD:${seed.systemKey}`] },
    });
  }

  const policyStatusSeeds = SEED_STAGES.filter(
    (s) => s.phase === "CLIENT" && s.systemKey,
  );
  for (const seed of policyStatusSeeds) {
    await db.policy.updateMany({
      where: { status: seed.systemKey as PolicyStatus, pipelineStageId: null },
      data: { pipelineStageId: stageIds[`CLIENT:${seed.systemKey}`] },
    });
  }

  // Prisma has no "UPDATE ... FROM another table" helper, so this one step
  // is raw SQL — copies each policy's leadType from whatever Lead it's
  // linked to, same reasoning as the loop above (only touches rows that
  // don't already have one set).
  const leadTypeResult = await db.$executeRaw(
    Prisma.sql`
      UPDATE "policies" p
      SET "leadType" = l."leadType"
      FROM "leads" l
      WHERE p."leadId" = l.id AND p."leadType" IS NULL
    `,
  );

  // Whatever's left still null at this point has no Lead to copy from at
  // all (a fully manual entry) — see the top-of-file note on why Veterans
  // Final Expense is the right default for every one of these.
  const defaultedResult = await db.policy.updateMany({
    where: { leadType: null },
    data: { leadType: "VETERANS_FINAL_EXPENSE" },
  });

  return NextResponse.json({
    stagesSeeded: Object.keys(stageIds).length,
    policiesLeadTypeBackfilled: leadTypeResult,
    policiesLeadTypeDefaulted: defaultedResult.count,
  });
}
