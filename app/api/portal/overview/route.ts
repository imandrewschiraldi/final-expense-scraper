import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { visibleChannelRoles } from "@/lib/chat";
import { rangeSince } from "@/lib/dashboardRange";
import { getAgencySettings } from "@/lib/agencySettings";
import { resolveOverviewLayout } from "@/lib/overviewWidgets";
import { getDownlineIds } from "@/lib/hierarchy";

const RECENT_MESSAGES = 5;
const RECENT_LESSONS = 5;
const NEW_LESSON_WINDOW_DAYS = 14;

export async function GET() {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;
  const { id: userId, role } = guard.session.user;

  const lessonSince = new Date(Date.now() - NEW_LESSON_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const yearStart = rangeSince("ytd")!;
  const monthStart = rangeSince("monthly")!;
  // Resolved up front (not inside the Promise.all below) since the Agency
  // track's issued-premium query depends on it.
  const downlineIds = await getDownlineIds(userId);

  const [
    visibleChannelIds,
    lessons,
    personalLifeIssued,
    personalAnnuityIssued,
    agencyIssued,
    monthIssuedPolicies,
    settings,
    widgetRows,
    recruitingUser,
  ] = await Promise.all([
    db.chatChannel
      .findMany({
        where: {
          archived: false,
          OR: [
            { restricted: false, minRole: { in: visibleChannelRoles(role) } },
            { restricted: true, members: { some: { userId } } },
          ],
        },
        select: { id: true },
      })
      .then((rows) => rows.map((r) => r.id)),
    db.trainingLesson.findMany({
      where: { createdAt: { gte: lessonSince } },
      orderBy: { createdAt: "desc" },
      take: RECENT_LESSONS,
      select: { id: true, title: true, createdAt: true, module: { select: { title: true } } },
    }),
    db.policy.findMany({
      where: { agentId: userId, status: "ISSUED", issuedAt: { gte: yearStart }, line: "LIFE" },
      select: { annualPremium: true },
    }),
    db.policy.findMany({
      where: { agentId: userId, status: "ISSUED", issuedAt: { gte: yearStart }, line: "ANNUITY" },
      select: { annualPremium: true },
    }),
    db.policy.findMany({
      where: { agentId: { in: downlineIds }, status: "ISSUED", issuedAt: { gte: yearStart } },
      select: { annualPremium: true },
    }),
    db.policy.findMany({
      where: { agentId: userId, status: "ISSUED", issuedAt: { gte: monthStart } },
      select: { annualPremium: true },
    }),
    getAgencySettings(),
    db.overviewWidget.findMany({ select: { id: true, order: true, enabled: true } }),
    role === "ADMIN" ? null : db.user.findUnique({ where: { id: userId }, select: { recruitingRadarEnabled: true } }),
  ]);

  // Recruiting Radar is dropped from the layout entirely (not just left
  // disabled) for a viewer without access, same gate as the full feature —
  // otherwise it'd leave an empty grid cell rather than just not being
  // there, since the widget itself only finds out it's forbidden after its
  // own fetch comes back.
  const hasRecruitingAccess = role === "ADMIN" || !!recruitingUser?.recruitingRadarEnabled;
  const layout = resolveOverviewLayout(
    new Map(widgetRows.map((w) => [w.id, { order: w.order, enabled: w.enabled }])),
  ).filter((w) => w.id !== "recruitingRadar" || hasRecruitingAccess);

  const messages = visibleChannelIds.length
    ? await db.chatMessage.findMany({
        where: { channelId: { in: visibleChannelIds }, deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: RECENT_MESSAGES,
        select: {
          id: true,
          body: true,
          authorName: true,
          createdAt: true,
          channel: { select: { name: true, slug: true } },
          author: { select: { role: true, profileImageUrl: true } },
        },
      })
    : [];

  const personalLifeAP = personalLifeIssued.reduce((sum, p) => sum + Number(p.annualPremium), 0);
  const personalAnnuityAP = personalAnnuityIssued.reduce((sum, p) => sum + Number(p.annualPremium), 0);
  const agencyAP = agencyIssued.reduce((sum, p) => sum + Number(p.annualPremium), 0);
  // Bonus Volume is a monthly schedule, not calendar-YTD like Hall of
  // Fame — it resets at the start of every month, so it reads against its
  // own monthly-only issued total rather than the year-to-date figure.
  const monthlyIssuedAP = monthIssuedPolicies.reduce((sum, p) => sum + Number(p.annualPremium), 0);

  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      body: m.body,
      // "Test Agent" is a leftover demo account's denormalised name from
      // before it was cleaned up — relabelled the same way an admin's own
      // name is on the Team Chat page, rather than shown as a real agent.
      authorName: m.author?.role === "ADMIN" || m.authorName === "Test Agent" ? "Admin" : m.authorName,
      authorProfileImageUrl: m.author?.profileImageUrl ?? null,
      createdAt: m.createdAt,
      channelName: m.channel.name,
      channelSlug: m.channel.slug,
    })),
    newLessons: lessons.map((l) => ({
      id: l.id,
      title: l.title,
      moduleTitle: l.module.title,
      createdAt: l.createdAt,
    })),
    hallOfFame: {
      personal: { issuedAP: personalLifeAP, targetAP: Number(settings.hallOfFameTargetAP) },
      agency: { issuedAP: agencyAP, targetAP: Number(settings.hallOfFameAgencyTargetAP) },
      annuity: { issuedAP: personalAnnuityAP, targetAP: Number(settings.hallOfFameAnnuityTargetAP) },
    },
    bonusVolume: {
      issuedAP: monthlyIssuedAP,
    },
    layout,
  });
}
