"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  ArrowLeft,
  Search,
} from "lucide-react";
import { Select, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
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
  availability: string | null;
  socialHandle: string | null;
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

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="font-condensed text-[11px] font-bold tracking-[0.12em] text-muted uppercase">{label}</p>
      <div className="mt-0.5 text-sm text-white">{value}</div>
    </div>
  );
}

function ApplicationDetailModal({
  application,
  onClose,
  onUpdateStatus,
  updating,
}: {
  application: Application | null;
  onClose: () => void;
  onUpdateStatus: (id: string, status: ApplicationStatusId) => void;
  updating: boolean;
}) {
  return (
    <Modal open={application !== null} onClose={onClose} title={application?.name ?? ""} maxWidthClassName="max-w-xl">
      {application && (
        <div className="space-y-5">
          {application.videoUrl ? (
            <video controls className="w-full rounded-lg border border-border bg-black" src={application.videoUrl} />
          ) : (
            <p className="rounded-lg border border-border/60 p-3 text-xs text-muted">No intro video submitted.</p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <DetailField label="Email" value={application.email ?? "—"} />
            <DetailField label="Phone" value={application.phone ?? "—"} />
            <DetailField label="State" value={application.state ?? "—"} />
            <DetailField label="Availability" value={application.availability ?? "—"} />
            <DetailField label="Experience" value={application.experience ?? "—"} />
            <DetailField label="Instagram / LinkedIn" value={application.socialHandle ?? "—"} />
            <DetailField label="Licensed" value={licensedBadge(application.licensed)} />
            <DetailField label="Applied" value={new Date(application.createdAt).toLocaleDateString()} />
          </div>

          <div>
            <p className="font-condensed mb-2 text-[11px] font-bold tracking-[0.12em] text-muted uppercase">Update Status</p>
            <div className="flex flex-wrap gap-2">
              {APPLICATION_STATUSES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  disabled={updating}
                  onClick={() => onUpdateStatus(application.id, s.id)}
                  className={cn(
                    "font-condensed rounded-lg border-[1.5px] px-3 py-1.5 text-[12px] font-bold tracking-[0.05em] uppercase transition-colors",
                    application.status === s.id
                      ? "border-copper bg-copper text-black"
                      : "border-border text-muted hover:border-copper hover:text-foreground",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function JobApplicationsPanel() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewFilter, setViewFilter] = useState<ApplicationStatusId | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  const statusFiltered = viewFilter === "ALL" ? applications : applications.filter((a) => a.status === viewFilter);
  const normalizedSearch = search.trim().toLowerCase();
  const visibleApplications = normalizedSearch
    ? statusFiltered.filter(
        (a) => a.name.toLowerCase().includes(normalizedSearch) || (a.email ?? "").toLowerCase().includes(normalizedSearch),
      )
    : statusFiltered;

  const selectedApplication = applications.find((a) => a.id === selectedId) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/admin/recruiting-radar"
          className="font-condensed flex items-center gap-1.5 text-[13px] font-bold tracking-[0.05em] text-muted uppercase hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Recruiting Radar
        </Link>
      </div>

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

          <div className="relative max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              placeholder="Search by name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
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
                {visibleApplications.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-muted">
                      No applications match &ldquo;{search}&rdquo;.
                    </td>
                  </tr>
                )}
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
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setSelectedId(a.id)}
                        className="font-semibold text-white hover:text-copper hover:underline"
                      >
                        {a.name}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {a.email && <div>{a.email}</div>}
                      {a.phone && <div>{a.phone}</div>}
                    </td>
                    <td className="px-4 py-3 text-muted">{a.state ?? "—"}</td>
                    <td className="px-4 py-3 text-muted">{a.experience ?? "—"}</td>
                    <td className="px-4 py-3">{licensedBadge(a.licensed)}</td>
                    <td className="px-4 py-3">
                      {a.videoUrl ? (
                        <Button variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={() => setSelectedId(a.id)}>
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

      <ApplicationDetailModal
        application={selectedApplication}
        onClose={() => setSelectedId(null)}
        onUpdateStatus={(id, status) => {
          updateStatus(id, status);
        }}
        updating={updatingId === selectedId}
      />
    </div>
  );
}
