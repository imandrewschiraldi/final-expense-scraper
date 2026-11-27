import { db } from "@/lib/db";
import type { PipelinePhase } from "@prisma/client";

/**
 * Looks up the PipelineStage row tied to a given legacy status value, so
 * routes that still accept/compute a LeadStatus or PolicyStatus (lead PATCH,
 * policy create/PATCH) can keep pipelineStageId in sync going forward,
 * without the admin seed route needing to be re-run for every new record.
 */
export async function stageIdForSystemKey(phase: PipelinePhase, systemKey: string) {
  const stage = await db.pipelineStage.findUnique({
    where: { phase_systemKey: { phase, systemKey } },
  });
  return stage?.id ?? null;
}

/**
 * The inverse: given a stage id a drag-and-drop move or manual pick targets,
 * returns its phase and systemKey (or null systemKey if it's a purely
 * organizational stage with no legacy equivalent, e.g. "Lapsed" / "Callback
 * Later"). Callers use the systemKey — when present — to run the exact same
 * status-change side effects (vault exit, contact log, issuedAt, status
 * history) that the legacy status-based update already applies, so a stage
 * change behaves identically no matter which field initiated it.
 */
export async function getStageTarget(stageId: string) {
  const stage = await db.pipelineStage.findUnique({
    where: { id: stageId },
    select: { phase: true, systemKey: true },
  });
  return stage ?? null;
}
