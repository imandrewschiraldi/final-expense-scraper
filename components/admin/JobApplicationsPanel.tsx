"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Users,
  UserPlus,
  PhoneCall,
  CalendarClock,
  MessageSquare,
  UserCheck,
  UserX,
  GraduationCap,
  BadgeCheck,
  CheckCircle2,
  PlayCircle,
} from "lucide-react";
import { Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { RecruitingKpiTiles, type RecruitingKpiEntry } from "@/components/admin/RecruitingKpiTiles";
import { FunnelBars } from "@/components/admin/FunnelBars";
import { APPLICATION_STATUSES, MAIN_FUNNEL_STATUSES, ONBOARDING_FUNNEL_STATUSES, type ApplicationStatusId } from "@/lib/jobApplications";

type Application = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  state: string | null;
  experience: string | null;
  licensed: boolean | null;
  videoUrl: string | null;
  status: ApplicationStatusId;
  createdAt: string;
};

const STATUS_ICON: Record<ApplicationStatusId, typeof Users> = {
  NEW: UserPlus,
  CONTACTED: PhoneCall,
  SCHEDULED: CalendarClock,
  INTERVIEWED: MessageSquare,
  HIRED: UserCheck,
  PRE_LICENSING: GraduationCap,
  LICENSED: BadgeCheck,
  ONBOARDED: CheckCircle2,
  REJECTED: UserX,
};

const STATUS_COLOR = Object.fromEntries(APPLICATION_STATUSES.map((s) => [s.id, s.color])) as Record<string, string>;
const STATUS_LABEL = Object.fromEntries(APPLICATION_STATUSES.map((s) => [s.id, s.label])) as Record<string, string>;

function licensedBadge(licensed: boolean | null) {
  if (licensed === null) return <span className="text-muted">—</span>;
  return licensed ? (
    <span className="rounded border border-green-light/40 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-green-light">
      LICENSED
    </span>
  ) : (
    <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted">
      UNLICENSED
    </span>
  );
}

export function JobApplicationsPanel() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewFilter, setViewFilter] = useState<ApplicationStatusId | "ALL">("ALL");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/job-applications");
    if (res.ok) {
      const data = await res.json();
      setApplications(data.applications);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(id: string, status: ApplicationStatusId) {
    const prev = applications.find((a) => a.id === id);
    if (!prev || prev.status === status) return;
    setUpdatingId(id);
    setApplications((all) => all.map((a) => (a.id === id ? { ...a, status } : a)));
    const res = await fetch(`/api/admin/job-applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setUpdatingId(null);
    if (!res.ok) await load();
  }

  const liveCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: applications.length };
    for (const s of APPLICATION_STATUSES) counts[s.id] = applications.filter((a) => a.status === s.id).length;
    return counts;
  }, [applications]);

  const kpiEntries = useMemo<RecruitingKpiEntry[]>(() => {
    const entries: RecruitingKpiEntry[] = [
      {
        key: "ALL",
        label: "Total Applications",
        value: liveCounts.ALL,
        icon: Users,
        onClick: () => setViewFilter("ALL"),
        active: viewFilter === "ALL",
      },
    ];
    const tileStatuses: ApplicationStatusId[] = ["NEW", "CONTACTED", "SCHEDULED", "INTERVIEWED", "HIRED", "REJECTED"];
    for (const id of tileStatuses) {
      entries.push({
        key: id,
        label: STATUS_LABEL[id],
        value: liveCounts[id] ?? 0,
        icon: STATUS_ICON[id],
        onClick: () => setViewFilter(id),
        active: viewFilter === id,
      });
    }
    return entries;
  }, [liveCounts, viewFilter]);

  const mainFunnelRows = MAIN_FUNNEL_STATUSES.map((id) => ({
    id,
    label: STATUS_LABEL[id],
    count: liveCounts[id] ?? 0,
    color: STATUS_COLOR[id],
  })).concat([{ id: "REJECTED", label: "Rejected", count: liveCounts.REJECTED ?? 0, color: STATUS_COLOR.REJECTED }]);

  const onboardingFunnelRows = ONBOARDING_FUNNEL_STATUSES.map((id) => ({
    id,
    label: STATUS_LABEL[id],
    count: liveCounts[id] ?? 0,
    color: STATUS_COLOR[id],
  }));

  const hireRate = liveCounts.ALL > 0 ? (liveCounts.HIRED ?? 0) / liveCounts.ALL : 0;
  const onboardRate = (liveCounts.HIRED ?? 0) > 0 ? (liveCounts.ONBOARDED ?? 0) / (liveCounts.HIRED ?? 1) : 0;

  const visibleApplications = viewFilter === "ALL" ? applications : applications.filter((a) => a.status === viewFilter);

  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-sm text-muted">
        Every applicant from the Apply Now form, funneled from first contact through onboarding — submissions land
        here automatically the moment someone applies.
      </p>

      {loading && <p className="text-sm text-muted">Loading...</p>}

      {!loading && applications.length === 0 ? (
        <p className="text-sm text-muted">No applications yet — they&apos;ll show up here the moment someone applies.</p>
      ) : (
        <>
          <RecruitingKpiTiles entries={kpiEntries} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <FunnelBars
              title="Application Funnel"
              rows={mainFunnelRows}
              conversion={{ label: "New → Hired Rate", rate: hireRate }}
            />
            <FunnelBars
              title="Onboarding Funnel"
              rows={onboardingFunnelRows}
              conversion={{ label: "Hired → Onboarded Rate", rate: onboardRate }}
            />
          </div>

          <div className="overflow-x-auto rounded-[10px] border border-border bg-surface">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="font-condensed border-b border-border text-[11px] font-bold tracking-[0.1em] text-muted uppercase">
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">State</th>
                  <th className="px-4 py-3">Experience</th>
                  <th className="px-4 py-3">Licensed</th>
                  <th className="px-4 py-3">Video</th>
                  <th className="px-4 py-3">Applied</th>
                </tr>
              </thead>
              <tbody>
                {visibleApplications.map((a) => (
                  <tr
                    key={a.id}
                    className={cn("border-b border-border/60 hover:bg-surface2", a.status === "REJECTED" && "opacity-35")}
                  >
                    <td className="px-4 py-3">
                      <Select
                        value={a.status}
                        disabled={updatingId === a.id}
                        onChange={(e) => updateStatus(a.id, e.target.value as ApplicationStatusId)}
                        className="w-36"
                      >
                        {APPLICATION_STATUSES.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-4 py-3 font-semibold text-white">{a.name}</td>
                    <td className="px-4 py-3 text-muted">
                      {a.email && <div>{a.email}</div>}
                      {a.phone && <div>{a.phone}</div>}
                    </td>
                    <td className="px-4 py-3 text-muted">{a.state ?? "—"}</td>
                    <td className="px-4 py-3 text-muted">{a.experience ?? "—"}</td>
                    <td className="px-4 py-3">{licensedBadge(a.licensed)}</td>
                    <td className="px-4 py-3">
                      {a.videoUrl ? (
                        <Button variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={() => window.open(a.videoUrl!, "_blank")}>
                          <PlayCircle className="mr-1 h-3.5 w-3.5" />
                          Watch
                        </Button>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted">{new Date(a.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
