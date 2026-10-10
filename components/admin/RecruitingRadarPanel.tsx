"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, ListTodo, Send, MessageCircle, UserCheck, UserX, Search, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { DashboardRangeSelect } from "@/components/portal/dashboard/DashboardRangeSelect";
import { RecruitingKpiTiles, type RecruitingKpiEntry } from "@/components/admin/RecruitingKpiTiles";
import { cn } from "@/lib/cn";
import { rangeSince, previousRangeWindow, DashboardRange } from "@/lib/dashboardRange";
import {
  CATEGORIES,
  MARKETS,
  HOT_COMBOS,
  RECRUIT_STATUSES,
  buildRecruitingDm,
  type CategoryKey,
  type MarketId,
  type RecruitStatusId,
} from "@/lib/recruitingRadar";

type StatusEvent = { toStatus: RecruitStatusId; createdAt: string };

type Prospect = {
  id: string;
  name: string;
  title: string;
  company: string;
  location: string;
  linkedinUrl: string | null;
  status: RecruitStatusId;
  category: string;
  market: string;
  dedupeKey: string;
  statusHistory: StatusEvent[];
};

const STATUS_ICON: Record<RecruitStatusId, typeof Send> = {
  NEW: ListTodo,
  DMD: Send,
  REPLIED: MessageCircle,
  HIRED: UserCheck,
  PASS: UserX,
};

function csvEscape(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export function RecruitingRadarPanel({ canViewApplications = true }: { canViewApplications?: boolean }) {
  const router = useRouter();
  const [applicationsCount, setApplicationsCount] = useState<{ total: number; new: number } | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Set<CategoryKey>>(new Set(["d2d"]));
  const [selectedMarkets, setSelectedMarkets] = useState<Set<MarketId>>(new Set(["tampa"]));
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(false);
  // Copy-action confirmations (Copy DM / Copy Info / Copy CSV) — shown
  // below the table, outside the search modal.
  const [statusMsg, setStatusMsg] = useState("");
  // Sweep progress/result messages — shown inside the search modal, kept
  // separate so a leftover "search complete" toast doesn't linger over the
  // table once the modal's closed.
  const [searchMsg, setSearchMsg] = useState("");
  const [searchError, setSearchError] = useState("");
  const [viewFilter, setViewFilter] = useState<RecruitStatusId | "ALL">("ALL");
  const [sweeping, setSweeping] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; failed: number } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [range, setRange] = useState<DashboardRange>("monthly");
  const cancelRef = useRef(false);

  const loadProspects = useCallback(async () => {
    const res = await fetch("/api/admin/recruiting/prospects");
    if (res.ok) {
      const data = await res.json();
      setProspects(data.prospects);
    }
  }, []);

  useEffect(() => {
    loadProspects();
  }, [loadProspects]);

  useEffect(() => {
    fetch("/api/admin/job-applications/count")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setApplicationsCount({ total: data.total, new: data.new }))
      .catch(() => {});
  }, []);

  function toggleCategory(key: CategoryKey) {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleMarket(id: MarketId) {
    setSelectedMarkets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function runOneSearch(catKey: CategoryKey, mktId: MarketId): Promise<number> {
    const res = await fetch("/api/admin/recruiting/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: catKey, market: mktId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Apollo search failed");
    if (data.added > 0) {
      setProspects((prev) => [...data.prospects.map((p: Prospect) => ({ ...p, statusHistory: [] })), ...prev]);
    }
    return data.added as number;
  }

  function handleSearch() {
    const combos: [CategoryKey, MarketId][] = [];
    for (const c of selectedCategories) for (const m of selectedMarkets) combos.push([c, m]);
    if (combos.length === 0) return;
    runSweep(combos, "Search complete");
  }

  function handleAllMarkets() {
    if (selectedCategories.size === 0) return;
    const combos: [CategoryKey, MarketId][] = [];
    for (const c of selectedCategories) for (const m of MARKETS) combos.push([c, m.id]);
    runSweep(combos, "Market sweep complete");
  }

  async function runSweep(combos: [CategoryKey, MarketId][], doneLabel: string) {
    cancelRef.current = false;
    setLoading(true);
    setSweeping(true);
    setSearchError("");
    setSearchMsg("");
    const total = combos.length;
    let done = 0;
    let failed = 0;
    let firstError = "";
    setProgress({ done: 0, total, failed: 0 });

    const CONCURRENCY = 3;
    let idx = 0;
    async function worker() {
      while (!cancelRef.current) {
        const my = idx++;
        if (my >= combos.length) break;
        const [c, m] = combos[my];
        try {
          await runOneSearch(c, m);
        } catch (e) {
          failed++;
          if (!firstError) firstError = e instanceof Error ? e.message : "Search failed";
        }
        done++;
        setProgress({ done, total, failed });
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    setLoading(false);
    setSweeping(false);
    setProgress(null);
    if (firstError) setSearchError(`First failure: ${firstError}`);
    setSearchMsg(
      cancelRef.current
        ? `Stopped after ${done} of ${total} searches${failed ? ` (${failed} failed)` : ""}.`
        : `${doneLabel} — ${total} searches run${failed ? `, ${failed} failed` : ""}.`,
    );
  }

  function handleEverything() {
    const combos: [CategoryKey, MarketId][] = [];
    for (const c of Object.keys(CATEGORIES) as CategoryKey[]) {
      for (const m of MARKETS) combos.push([c, m.id]);
    }
    runSweep(combos, "Full sweep complete");
  }

  function handleHotCombos() {
    runSweep(HOT_COMBOS, "Hot combos complete");
  }

  function handleStop() {
    cancelRef.current = true;
  }

  async function updateStatus(id: string, status: RecruitStatusId) {
    const prev = prospects.find((p) => p.id === id);
    if (!prev || prev.status === status) return;
    setProspects((all) => all.map((p) => (p.id === id ? { ...p, status } : p)));
    const res = await fetch(`/api/admin/recruiting/prospects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const data = await res.json();
      setProspects((all) => all.map((p) => (p.id === id ? { ...p, ...data.prospect } : p)));
    }
  }

  function copyDm(p: Prospect) {
    const dm = buildRecruitingDm(p);
    navigator.clipboard.writeText(dm);
    setStatusMsg(`DM copied for ${p.name.split(" ")[0]} — paste it in LinkedIn or IG.`);
  }

  function copyInfo(p: Prospect) {
    const text = `${p.name} — ${p.title}${p.company ? ` at ${p.company}` : ""} (${p.location}) ${p.linkedinUrl ?? ""}`.trim();
    navigator.clipboard.writeText(text);
    setStatusMsg("Profile info copied.");
  }

  function copyAllCsv() {
    const header = "Name,Title,Company,Location,LinkedIn,Category,Market,Status";
    const rows = prospects.map((p) =>
      [
        p.name,
        p.title,
        p.company,
        p.location,
        p.linkedinUrl ?? "",
        p.category,
        p.market,
        RECRUIT_STATUSES.find((s) => s.id === p.status)?.label ?? p.status,
      ]
        .map((v) => csvEscape(String(v)))
        .join(","),
    );
    navigator.clipboard.writeText([header, ...rows].join("\n"));
    setStatusMsg(`Copied ${prospects.length} rows as CSV.`);
  }

  // Live current-state counts (used both for the "currently sitting here"
  // captions and to drive the table filter when a tile is clicked).
  const liveCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: prospects.length };
    for (const s of RECRUIT_STATUSES) counts[s.id] = prospects.filter((p) => p.status === s.id).length;
    return counts;
  }, [prospects]);

  // Time-windowed activity counts — how many prospects were actually moved
  // INTO a given status within the selected range, not how many currently
  // sit there. This is what makes the dashboard useful for a pool that was
  // sourced once and worked over months: "14 DM'd this week" is a real
  // activity signal, "14 currently DM'd" isn't.
  const kpiEntries = useMemo<RecruitingKpiEntry[]>(() => {
    const since = rangeSince(range);
    const prevWindow = previousRangeWindow(range);

    function countSince(statusId: RecruitStatusId, from: Date | null): number {
      let n = 0;
      for (const p of prospects) {
        for (const h of p.statusHistory) {
          if (h.toStatus !== statusId) continue;
          if (from === null || new Date(h.createdAt) >= from) n++;
        }
      }
      return n;
    }

    function countInWindow(statusId: RecruitStatusId, start: Date, end: Date): number {
      let n = 0;
      for (const p of prospects) {
        for (const h of p.statusHistory) {
          if (h.toStatus !== statusId) continue;
          const t = new Date(h.createdAt);
          if (t >= start && t < end) n++;
        }
      }
      return n;
    }

    const entries: RecruitingKpiEntry[] = [
      {
        key: "ALL",
        label: "Total Sourced",
        value: liveCounts.ALL,
        icon: Users,
        onClick: () => setViewFilter("ALL"),
        active: viewFilter === "ALL",
      },
    ];

    for (const s of RECRUIT_STATUSES) {
      const isBacklog = s.id === "NEW";
      const value = isBacklog ? liveCounts.NEW : countSince(s.id, since);
      const previousValue = isBacklog || !prevWindow ? undefined : countInWindow(s.id, prevWindow.start, prevWindow.end);
      entries.push({
        key: s.id,
        label: isBacklog ? s.label : `${s.label}${range === "all" ? "" : ` (${range === "daily" ? "today" : range === "weekly" ? "this week" : range === "monthly" ? "this month" : "this year"})`}`,
        value,
        previousValue,
        icon: STATUS_ICON[s.id],
        onClick: () => setViewFilter(s.id),
        active: viewFilter === s.id,
        caption: isBacklog ? undefined : `${liveCounts[s.id] ?? 0} currently`,
      });
    }

    entries.push({
      key: "APPLICATIONS",
      label: "Applications",
      value: applicationsCount?.total ?? 0,
      icon: ClipboardList,
      // Job Applications is a separate page, open to Admins and Managers
      // (its API routes use requireAdminOrManager) — a flagged agent can
      // see this count here, but clicking through would just 403, so the
      // tile's a no-op for them instead.
      onClick: () => {
        if (canViewApplications) router.push("/admin/job-applications");
      },
      active: false,
      caption:
        applicationsCount && applicationsCount.new > 0
          ? `${applicationsCount.new} new`
          : canViewApplications
            ? "Job Applications"
            : "Job Applications (admin/manager only)",
    });

    return entries;
  }, [prospects, range, viewFilter, liveCounts, applicationsCount, router, canViewApplications]);

  const visibleProspects = viewFilter === "ALL" ? prospects : prospects.filter((p) => p.status === viewFilter);
  const comboCount = selectedCategories.size * selectedMarkets.size;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted">
          State-of-the-art recruiting funnel — sources candidates from Apollo by background and market, dedupes
          automatically, and everything saves here so the whole team sees the same pipeline.
        </p>
        <div className="flex items-center gap-2">
          <DashboardRangeSelect value={range} onChange={setRange} />
          <Button onClick={() => setSearchOpen(true)}>
            <Search className="mr-1.5 h-4 w-4" />
            Search for New Prospects
          </Button>
        </div>
      </div>

      <RecruitingKpiTiles entries={kpiEntries} />

      {statusMsg && <p className="text-sm text-muted">{statusMsg}</p>}

      {prospects.length > 0 && (
        <div className="flex justify-end">
          <Button variant="ghost" onClick={copyAllCsv}>
            Copy all as CSV ({prospects.length})
          </Button>
        </div>
      )}

      {prospects.length === 0 ? (
        <p className="text-sm text-muted">
          Hit &ldquo;Search for New Prospects&rdquo; above to pick a background and market — results stack up here,
          dedupe is automatic, and everything saves for the whole team.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[10px] border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="font-condensed border-b border-border text-[11px] font-bold tracking-[0.1em] text-muted uppercase">
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Title / Company</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {visibleProspects.map((p) => (
                <tr
                  key={p.id}
                  className={cn("border-b border-border/60 hover:bg-surface2", p.status === "PASS" && "opacity-35")}
                >
                  <td className="px-4 py-3">
                    <Select
                      value={p.status}
                      onChange={(e) => updateStatus(p.id, e.target.value as RecruitStatusId)}
                      className="w-32"
                    >
                      {RECRUIT_STATUSES.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className="px-4 py-3 font-semibold text-white">
                    {p.linkedinUrl ? (
                      <a href={p.linkedinUrl} target="_blank" rel="noopener noreferrer" className="hover:text-copper">
                        {p.name}
                      </a>
                    ) : (
                      p.name
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {p.title}
                    {p.company && <span className="text-muted/70"> · {p.company}</span>}
                  </td>
                  <td className="px-4 py-3 text-muted">{p.location}</td>
                  <td className="px-4 py-3">
                    <span className="mr-1 inline-block rounded border border-border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted">
                      {p.category}
                    </span>
                    <span className="inline-block rounded border border-border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted">
                      {p.market}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Button variant="secondary" onClick={() => copyDm(p)} className="mr-1.5 !px-3 !py-1.5 text-xs">
                      Copy DM
                    </Button>
                    <Button variant="ghost" onClick={() => copyInfo(p)} className="!px-2.5 !py-1.5 text-xs">
                      Info
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={searchOpen} onClose={() => setSearchOpen(false)} title="Search for New Prospects">
        <div className="space-y-5">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="font-condensed text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
                Background <span className="normal-case text-muted/60">(select any number)</span>
              </label>
              {selectedCategories.size > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedCategories(new Set())}
                  className="text-xs font-semibold text-muted hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(CATEGORIES) as CategoryKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleCategory(key)}
                  className={cn(
                    "font-condensed rounded-lg border-[1.5px] px-4 py-2 text-left text-[13px] font-bold tracking-[0.05em] uppercase transition-colors",
                    selectedCategories.has(key)
                      ? "toggle-pill-active"
                      : "border-copper-dim text-muted hover:border-copper hover:text-foreground",
                  )}
                >
                  {CATEGORIES[key].label}
                  <span className="ml-1.5 font-normal normal-case opacity-70">· {CATEGORIES[key].sub}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="font-condensed text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
                Market <span className="normal-case text-muted/60">(select any number)</span>
              </label>
              {selectedMarkets.size > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedMarkets(new Set())}
                  className="text-xs font-semibold text-muted hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {MARKETS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleMarket(m.id)}
                  className={cn(
                    "font-condensed rounded-lg border-[1.5px] px-4 py-2 text-[13px] font-bold tracking-[0.05em] uppercase transition-colors",
                    selectedMarkets.has(m.id)
                      ? "toggle-pill-active"
                      : "border-copper-dim text-muted hover:border-copper hover:text-foreground",
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
            <Button onClick={handleSearch} disabled={loading || selectedCategories.size === 0 || selectedMarkets.size === 0}>
              {loading && !sweeping ? "Searching..." : `Search Selected (${comboCount})`}
            </Button>
            <Button variant="secondary" onClick={handleAllMarkets} disabled={loading || selectedCategories.size === 0}>
              Selected backgrounds × all {MARKETS.length} markets
            </Button>
            <Button onClick={handleHotCombos} disabled={loading}>
              Hot combos ({HOT_COMBOS.length})
            </Button>
            <Button variant="secondary" onClick={handleEverything} disabled={loading}>
              Everything ({Object.keys(CATEGORIES).length * MARKETS.length})
            </Button>
            {sweeping && (
              <Button variant="danger" onClick={handleStop}>
                Stop
              </Button>
            )}
          </div>

          {progress && (
            <div>
              <div className="mb-1 flex justify-between text-xs font-semibold text-muted">
                <span>
                  Sweeping... {progress.done}/{progress.total} searches
                </span>
                <span>
                  {prospects.length} prospects{progress.failed > 0 ? ` · ${progress.failed} failed` : ""}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface2">
                <div
                  className="h-full bg-copper transition-all duration-300"
                  style={{ width: `${(progress.done / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {searchMsg && <p className="text-sm text-muted">{searchMsg}</p>}
          {searchError && <p className="text-sm text-red-light">{searchError}</p>}
        </div>
      </Modal>
    </div>
  );
}
