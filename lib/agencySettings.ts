import { db } from "@/lib/db";
import { OverviewSubtitleColor } from "@prisma/client";

const SINGLETON_ID = "singleton";

/** The one row of agency-wide feature toggles. The migration seeds it, but
 *  upsert here too so a settings read never 500s if that row is ever
 *  missing (a reset dev DB, a manual delete, etc.) — same defensive stance
 *  as everything else in this file reading live, mutable settings. */
export async function getAgencySettings() {
  return db.agencySettings.upsert({
    where: { id: SINGLETON_ID },
    update: {},
    create: { id: SINGLETON_ID },
  });
}

export async function setLeaderboardAllTimeEnabled(enabled: boolean) {
  return db.agencySettings.upsert({
    where: { id: SINGLETON_ID },
    update: { leaderboardAllTimeEnabled: enabled },
    create: { id: SINGLETON_ID, leaderboardAllTimeEnabled: enabled },
  });
}

export async function setOverviewSubtitle(data: { text: string; color: OverviewSubtitleColor; bold: boolean }) {
  const fields = { overviewSubtitleText: data.text, overviewSubtitleColor: data.color, overviewSubtitleBold: data.bold };
  return db.agencySettings.upsert({
    where: { id: SINGLETON_ID },
    update: fields,
    create: { id: SINGLETON_ID, ...fields },
  });
}
