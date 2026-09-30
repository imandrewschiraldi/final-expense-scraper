"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { StatCard } from "@/components/admin/StatCard";
import { cn } from "@/lib/cn";
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
};

function csvEscape(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export function RecruitingRadarPanel() {
  const [category, setCategory] = useState<CategoryKey>("d2d");
  const [market, setMarket] = useState<MarketId>("tampa");
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [viewFilter, setViewFilter] = useState<RecruitStatusId | "ALL">("ALL");
  const [sweeping, setSweeping] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; failed: number } | null>(null);
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

  async function runOneSearch(catKey: CategoryKey, mktId: MarketId): Promise<number> {
    const res = await fetch("/api/admin/recruiting/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: catKey, market: mktId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Apollo search failed");
    if (data.added > 0) setProspects((prev) => [...data.prospects, ...prev]);
    return data.added as number;
  }

  async function handleSearch() {
    const cat = CATEGORIES[category];
    const mkt = MARKETS.find((m) => m.id === market)!;
    setLoading(true);
    setErrorMsg("");
    setStatusMsg(`Searching ${cat.label} — ${mkt.label}…`);
    try {
      const added = await runOneSearch(category, market);
      setStatusMsg(`Done — ${added} found in ${mkt.label}.`);
    } catch (e) {
      setErrorMsg(`${cat.label} — ${mkt.label}: ${e instanceof Error ? e.message : "Search failed"}`);
      setStatusMsg("");
    } finally {
      setLoading(false);
    }
  }

  async function handleAllMarkets() {
    setLoading(true);
    setErrorMsg("");
    cancelRef.current = false;
    for (const m of MARKETS) {
      if (cancelRef.current) break;
      try {
        await runOneSearch(category, m.id);
      } catch (e) {
        setErrorMsg((prev) => prev || (e instanceof Error ? e.message : "Search failed"));
      }
    }
    setLoading(false);
    setStatusMsg("Market sweep complete.");
  }

  async function runSweep(combos: [CategoryKey, MarketId][], doneLabel: string) {
    cancelRef.current = false;
    setLoading(true);
    setSweeping(true);
    setErrorMsg("");
    setStatusMsg("");
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
    if (firstError) setErrorMsg(`First failure: ${firstError}`);
    setStatusMsg(
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
    setProspects((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
    await fetch(`/api/admin/recruiting/prospects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
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

  const counts: Record<string, number> = { ALL: prospects.length };
  for (const s of RECRUIT_STATUSES) counts[s.id] = prospects.filter((p) => p.status === s.id).length;

  const visibleProspects = viewFilter === "ALL" ? prospects : prospects.filter((p) => p.status === viewFilter);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        State-of-the-art recruiting funnel — sources candidates from Apollo by background and market, dedupes
        automatically, and everything saves here so the whole team sees the same pipeline.
      </p>

      <div>
        <label className="font-condensed mb-2 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
          Background
        </label>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(CATEGORIES) as CategoryKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setCategory(key)}
              className={cn(
                "font-condensed rounded-lg border-[1.5px] px-4 py-2 text-left text-[13px] font-bold tracking-[0.05em] uppercase transition-colors",
                category === key
                  ? "border-copper bg-copper text-black"
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
        <label className="font-condensed mb-2 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
          Market
        </label>
        <div className="flex flex-wrap gap-2">
          {MARKETS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMarket(m.id)}
              className={cn(
                "font-condensed rounded-lg border-[1.5px] px-4 py-2 text-[13px] font-bold tracking-[0.05em] uppercase transition-colors",
                market === m.id
                  ? "border-copper bg-copper text-black"
                  : "border-copper-dim text-muted hover:border-copper hover:text-foreground",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={handleSearch} disabled={loading}>
          {loading && !sweeping ? "Searching..." : `Search ${CATEGORIES[category].label}`}
        </Button>
        <Button variant="secondary" onClick={handleAllMarkets} disabled={loading}>
          Run all {MARKETS.length} markets
        </Button>
        <Button onClick={handleHotCombos} disabled={loading}>
          Run hot combos ({HOT_COMBOS.length})
        </Button>
        <Button variant="secondary" onClick={handleEverything} disabled={loading}>
          Run everything ({Object.keys(CATEGORIES).length * MARKETS.length})
        </Button>
        {sweeping && (
          <Button variant="danger" onClick={handleStop}>
            Stop
          </Button>
        )}
        {prospects.length > 0 && (
          <Button variant="ghost" onClick={copyAllCsv}>
            Copy all as CSV ({prospects.length})
          </Button>
        )}
      </div>

      {progress && (
        <div className="max-w-md">
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

      {statusMsg && <p className="text-sm text-muted">{statusMsg}</p>}
      {errorMsg && <p className="text-sm text-red-light">{errorMsg}</p>}

      {prospects.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          <button type="button" onClick={() => setViewFilter("ALL")} className="text-left">
            <StatCard label="Total Scraped" value={counts.ALL} accent="copper" />
          </button>
          {RECRUIT_STATUSES.map((s) => (
            <button key={s.id} type="button" onClick={() => setViewFilter(s.id)} className="text-left">
              <StatCard
                label={s.label}
                value={counts[s.id] ?? 0}
                accent={s.id === "HIRED" ? "green" : s.id === "PASS" ? "red" : "teal"}
              />
            </button>
          ))}
        </div>
      )}

      {prospects.length === 0 ? (
        <p className="text-sm text-muted">
          Pick a background and a market, then hit search. Results stack up here — dedupe is automatic and
          everything saves for the whole team.
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
    </div>
  );
}
