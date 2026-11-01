"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Radar } from "lucide-react";
import { Card } from "@/components/ui/Card";

type Summary = {
  counts: Record<string, number>;
  recent: { id: string; prospectName: string; toStatus: string; createdAt: string }[];
};

const STATUS_LABEL: Record<string, string> = { NEW: "New", DMD: "DM'd", REPLIED: "Replied", HIRED: "Hired", PASS: "Passed" };
const STATUS_ORDER = ["NEW", "DMD", "REPLIED", "HIRED", "PASS"];

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.floor(hr / 24)}d`;
}

/** 7-day Recruiting Radar activity — admin always has access, an
 *  agent/manager only once flipped on for their account specifically, same
 *  gate as the full feature. An account without access gets a 403 from the
 *  summary endpoint and this renders nothing at all, so an admin can enable
 *  the tile agency-wide without it showing up for accounts that can't use
 *  Recruiting Radar in the first place. */
export function RecruitingRadarWidget() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/portal/recruiting-radar-summary")
      .then((res) => {
        if (res.status === 403) {
          if (!cancelled) setForbidden(true);
          return null;
        }
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((data) => data && !cancelled && setSummary(data))
      .catch(() => !cancelled && setForbidden(true));
    return () => {
      cancelled = true;
    };
  }, []);

  if (forbidden) return null;

  return (
    <Card data-tour="recruiting-radar-widget" className="flex h-full flex-col p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radar className="h-[18px] w-[18px]" style={{ color: "var(--copper-metal-hi)" }} />
          <h3 className="font-condensed text-[15.5px] font-extrabold tracking-wide text-white uppercase">Recruiting Radar</h3>
        </div>
        <Link href="/admin/recruiting-radar" className="font-condensed text-[11px] font-bold tracking-wide text-teal-light uppercase hover:underline">
          View All
        </Link>
      </div>

      {!summary ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : summary.recent.length === 0 ? (
        <p className="text-sm text-muted">No recruiting activity in the last 7 days.</p>
      ) : (
        <>
          <div className="mb-3.5 grid grid-cols-5 gap-1">
            {STATUS_ORDER.map((key) => (
              <div key={key} className="text-center">
                <div className="font-condensed text-[15px] font-extrabold text-white">{summary.counts[key] ?? 0}</div>
                <div className="font-condensed text-[9px] tracking-wide text-muted uppercase">{STATUS_LABEL[key]}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            {summary.recent.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2">
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">{r.prospectName}</span>
                <span className="font-condensed shrink-0 text-[10.5px] tracking-wide text-muted uppercase">
                  {STATUS_LABEL[r.toStatus] ?? r.toStatus} &middot; {timeAgo(r.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
