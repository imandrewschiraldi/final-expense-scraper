import { db } from "@/lib/db";
import { ANNUAL_REVIEW_STAGE_NAME } from "@/lib/pipelineStages";
import { getCalendarEventsForUser } from "@/lib/calendarEvents";
import { expandOccurrences } from "@/lib/calendarRecurrence";

const UPCOMING_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;

// The two reminder kinds Book of Business auto-creates on an agent's own
// calendar (see lib/calendarEvents.ts) — excluded when looking for the
// "next meeting" fallback below, since a due follow-up or a ready annual
// review is already its own, more specific case before this one ever runs.
const REMINDER_TITLE_PREFIXES = ["Follow Up:", "Annual Review:"];

export type OverviewTodo =
  | { kind: "followUp"; text: string; href: string }
  | { kind: "annualReview"; text: string; href: string }
  // startAt is the real instant (ISO) of the next occurrence — left
  // unformatted so the client can render it in the viewer's own chosen
  // time zone, same as the Calendar widget does.
  | { kind: "meeting"; text: string; href: string; startAt: string };

/** What shows under "Welcome back" in place of the agency's own subtitle,
 *  whenever this agent has something more specifically theirs to act on
 *  right now: a follow-up due, a policy the Annual Review cron just moved
 *  into "Annual Review Ready" (see lib/annualReview.ts), or — when neither
 *  applies — whatever's next on their own calendar. Returns null when none
 *  of those apply, so the client falls back to the agency's own subtitle. */
export async function getOverviewTodo(
  userId: string,
): Promise<OverviewTodo | null> {
  const now = new Date();

  const [dueFollowUps, annualReviewStage] = await Promise.all([
    db.policy.findMany({
      where: { agentId: userId, followUpAt: { lte: now } },
      orderBy: { followUpAt: "asc" },
      select: { clientName: true },
    }),
    db.pipelineStage.findFirst({
      where: { phase: "CLIENT", name: ANNUAL_REVIEW_STAGE_NAME },
      select: { id: true },
    }),
  ]);

  if (dueFollowUps.length > 0) {
    return {
      kind: "followUp",
      text:
        dueFollowUps.length === 1
          ? `Follow up with ${dueFollowUps[0].clientName} today.`
          : `You have ${dueFollowUps.length} follow-ups due.`,
      href: "/book-of-business",
    };
  }

  const annualReviews = annualReviewStage
    ? await db.policy.findMany({
        where: { agentId: userId, pipelineStageId: annualReviewStage.id },
        select: { clientName: true },
      })
    : [];

  if (annualReviews.length > 0) {
    return {
      kind: "annualReview",
      text:
        annualReviews.length === 1
          ? `${annualReviews[0].clientName}'s policy is ready for its annual review.`
          : `${annualReviews.length} policies are ready for their annual review.`,
      href: "/book-of-business",
    };
  }

  const events = await getCalendarEventsForUser(userId);
  const [upcoming] = expandOccurrences(
    events.filter(
      (e) => !REMINDER_TITLE_PREFIXES.some((p) => e.title.startsWith(p)),
    ),
    now,
    new Date(now.getTime() + UPCOMING_WINDOW_MS),
  );

  if (upcoming) {
    return {
      kind: "meeting",
      text: `Next up: ${upcoming.title}`,
      href: "/calendar",
      startAt: upcoming.occurrenceStart.toISOString(),
    };
  }

  return null;
}
