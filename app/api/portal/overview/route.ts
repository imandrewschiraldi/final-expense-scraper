import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { visibleChannelRoles, ADMIN_MARK_URL, BOT_MARK_URL } from "@/lib/chat";
import { rangeSince } from "@/lib/dashboardRange";
import { getAgencySettings } from "@/lib/agencySettings";
import { resolveOverviewLayout } from "@/lib/overviewWidgets";
import { getDownlineIds } from "@/lib/hierarchy";
import {
  generateDemoPolicies,
  generateDemoAgencyPolicies,
} from "@/lib/demoData";

const RECENT_MESSAGES = 5;
const RECENT_LESSONS = 5;
const NEW_LESSON_WINDOW_DAYS = 14;

export async function GET() {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;
  const { id: userId, role } = guard.session.user;

  const lessonSince = new Date(
    Date.now() - NEW_LESSON_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );
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
    viewer,
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
      select: {
        id: true,
        title: true,
        createdAt: true,
        module: { select: { title: true } },
      },
    }),
    db.policy.findMany({
      where: {
        agentId: userId,
        status: "ISSUED",
        issuedAt: { gte: yearStart },
        line: "LIFE",
      },
      select: { annualPremium: true },
    }),
    db.policy.findMany({
      where: {
        agentId: userId,
        status: "ISSUED",
        issuedAt: { gte: yearStart },
        line: "ANNUITY",
      },
      select: { annualPremium: true },
    }),
    db.policy.findMany({
      where: {
        agentId: { in: downlineIds },
        status: "ISSUED",
        issuedAt: { gte: yearStart },
      },
      select: { annualPremium: true },
    }),
    db.policy.findMany({
      where: {
        agentId: userId,
        status: "ISSUED",
        issuedAt: { gte: monthStart },
      },
      select: { annualPremium: true },
    }),
    getAgencySettings(),
    db.overviewWidget.findMany({
      select: { id: true, order: true, enabled: true },
    }),
    role === "ADMIN"
      ? null
      : db.user.findUnique({
          where: { id: userId },
          select: { recruitingRadarEnabled: true },
        }),
    db.user.findUnique({
      where: { id: userId },
      select: { demoModeEnabled: true },
    }),
  ]);

  // Recruiting Radar is dropped from the layout entirely (not just left
  // disabled) for a viewer without access, same gate as the full feature —
  // otherwise it'd leave an empty grid cell rather than just not being
  // there, since the widget itself only finds out it's forbidden after its
  // own fetch comes back.
  const hasRecruitingAccess =
    role === "ADMIN" || !!recruitingUser?.recruitingRadarEnabled;
  const layout = resolveOverviewLayout(
    new Map(
      widgetRows.map((w) => [w.id, { order: w.order, enabled: w.enabled }]),
    ),
  ).filter((w) => w.id !== "recruitingRadar" || hasRecruitingAccess);

  const messages = visibleChannelIds.length
    ? await db.chatMessage.findMany({
        where: { channelId: { in: visibleChannelIds }, deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: RECENT_MESSAGES,
        select: {
          id: true,
          authorId: true,
          body: true,
          authorName: true,
          createdAt: true,
          externalId: true,
          externalAvatarUrl: true,
          channel: { select: { name: true, slug: true } },
          author: { select: { role: true, profileImageUrl: true } },
        },
      })
    : [];

  let personalLifeAP = personalLifeIssued.reduce(
    (sum, p) => sum + Number(p.annualPremium),
    0,
  );
  let personalAnnuityAP = personalAnnuityIssued.reduce(
    (sum, p) => sum + Number(p.annualPremium),
    0,
  );
  let agencyAP = agencyIssued.reduce(
    (sum, p) => sum + Number(p.annualPremium),
    0,
  );
  // Bonus Volume is a monthly schedule, not calendar-YTD like Hall of
  // Fame — it resets at the start of every month, so it reads against its
  // own monthly-only issued total rather than the year-to-date figure.
  let monthlyIssuedAP = monthIssuedPolicies.reduce(
    (sum, p) => sum + Number(p.annualPremium),
    0,
  );

  // Demo Mode: same per-viewer, read-time-only overlay every other page
  // applies (nothing written back, no other viewer's numbers touched) —
  // Hall of Fame's three tracks and Bonus Volume all swap to fake
  // production instead of the viewer's own real (often near-empty) rows.
  if (viewer?.demoModeEnabled) {
    const demoPolicies = generateDemoPolicies();
    const demoIssuedSince = (since: Date) =>
      demoPolicies.filter(
        (p) => p.status === "ISSUED" && p.issuedAt && p.issuedAt >= since,
      );

    const demoYearIssued = demoIssuedSince(yearStart);
    personalLifeAP = demoYearIssued
      .filter((p) => p.product !== "Annuities")
      .reduce((sum, p) => sum + p.annualPremium, 0);
    personalAnnuityAP = demoYearIssued
      .filter((p) => p.product === "Annuities")
      .reduce((sum, p) => sum + p.annualPremium, 0);
    monthlyIssuedAP = demoIssuedSince(monthStart).reduce(
      (sum, p) => sum + p.annualPremium,
      0,
    );

    // The Agency track reads as the whole agency, not just this viewer's
    // downline, same "reads as one thriving agency" approach the Agency
    // Dashboard's own Demo Mode overlay already uses — fake production for
    // every other active agent, generated fresh (not stored) same as the
    // viewer's own.
    const otherAgents = await db.user.findMany({
      where: { active: true, id: { not: userId } },
      select: { id: true, name: true, profileImageUrl: true },
    });
    const demoAgencyPolicies = generateDemoAgencyPolicies(otherAgents);
    const demoAgencyYearIssued = demoAgencyPolicies.filter(
      (p) => p.status === "ISSUED" && p.issuedAt && p.issuedAt >= yearStart,
    );
    agencyAP =
      personalLifeAP +
      personalAnnuityAP +
      demoAgencyYearIssued.reduce((sum, p) => sum + p.annualPremium, 0);
  }

  return NextResponse.json({
    messages: messages.map((m) => {
      // "Test Agent" is a leftover demo account's denormalised name from
      // before it was cleaned up — relabelled the same way an admin's own
      // name is on the Team Chat page, rather than shown as a real agent.
      const isAdmin =
        m.author?.role === "ADMIN" || m.authorName === "Test Agent";
      // A bridged post (GroupMe) is authorId-null too, but it's a real
      // person, not the in-app Sales Bot — same distinction the full Team
      // Chat page's own shape() makes. A bridged sender with no avatar of
      // their own gets null here, same as any other photo-less sender, so
      // the client falls back to initials instead of the Sales Bot mark.
      const isBridged = m.externalId !== null;
      const isSystem = m.authorId === null && !isBridged;
      return {
        id: m.id,
        body: m.body,
        authorName: isAdmin ? "Admin" : m.authorName,
        // Admin and system (Sales Bot) posts speak for the agency, not a
        // person — a fixed company mark, never whichever personal photo
        // the admin account happens to have set, same override the full
        // Team Chat page applies.
        authorProfileImageUrl: isAdmin
          ? ADMIN_MARK_URL
          : m.externalAvatarUrl
            ? m.externalAvatarUrl
            : isSystem
              ? BOT_MARK_URL
              : (m.author?.profileImageUrl ?? null),
        createdAt: m.createdAt,
        channelName: m.channel.name,
        channelSlug: m.channel.slug,
      };
    }),
    newLessons: lessons.map((l) => ({
      id: l.id,
      title: l.title,
      moduleTitle: l.module.title,
      createdAt: l.createdAt,
    })),
    overviewSubtitle: {
      text: settings.overviewSubtitleText,
      color: settings.overviewSubtitleColor,
      bold: settings.overviewSubtitleBold,
    },
    hallOfFame: {
      personal: {
        issuedAP: personalLifeAP,
        targetAP: Number(settings.hallOfFameTargetAP),
      },
      agency: {
        issuedAP: agencyAP,
        targetAP: Number(settings.hallOfFameAgencyTargetAP),
      },
      annuity: {
        issuedAP: personalAnnuityAP,
        targetAP: Number(settings.hallOfFameAnnuityTargetAP),
      },
    },
    bonusVolume: {
      issuedAP: monthlyIssuedAP,
    },
    layout,
  });
}
