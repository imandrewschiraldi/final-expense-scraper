import { db } from "@/lib/db";
import { stageIdForSystemKey } from "@/lib/pipelineSync";
import { ANNUAL_REVIEW_STAGE_NAME } from "@/lib/pipelineStages";

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * Moves every policy that's been sitting in Submitted or Issued for a full
 * year into the "Annual Review Ready" stage — the Client pipeline's own
 * visible signal that it's time to reach back out, alongside (not instead
 * of) the calendar reminder already scheduled for the same date when the
 * policy was first submitted (see lib/calendarEvents.ts's
 * createAnnualReviewEvent). "Annual Review Ready" has no systemKey (see
 * lib/pipelineStages.ts), so this only ever moves pipelineStageId — the
 * policy's real `status` (which Hall of Fame/Leaderboard/both dashboards
 * depend on) is left exactly as it was, same rule the stage-change API
 * itself already follows for any systemKey-less stage. Safe to run more
 * than once a day: once a policy's pipelineStageId has moved, it no longer
 * matches the where clause below, so it's never re-processed.
 */
export async function transitionDueAnnualReviews() {
  const [annualReviewStage, submittedStageId, issuedStageId] =
    await Promise.all([
      db.pipelineStage.findFirst({
        where: { phase: "CLIENT", name: ANNUAL_REVIEW_STAGE_NAME },
        select: { id: true },
      }),
      stageIdForSystemKey("CLIENT", "SUBMITTED"),
      stageIdForSystemKey("CLIENT", "ISSUED"),
    ]);

  if (!annualReviewStage) {
    // Pipeline stages have never been seeded on this account (see the
    // admin "Run Setup" button) — nothing to transition into yet.
    return { transitioned: 0 };
  }

  const dueBefore = new Date(Date.now() - ONE_YEAR_MS);
  const activeStageIds = [submittedStageId, issuedStageId].filter(
    (id): id is string => !!id,
  );
  if (activeStageIds.length === 0) return { transitioned: 0 };

  const result = await db.policy.updateMany({
    where: {
      submittedAt: { lte: dueBefore },
      pipelineStageId: { in: activeStageIds },
    },
    data: { pipelineStageId: annualReviewStage.id },
  });

  return { transitioned: result.count };
}
