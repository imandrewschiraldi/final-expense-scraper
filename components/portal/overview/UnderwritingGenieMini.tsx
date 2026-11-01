"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import type { Condition, Medication, SearchHit } from "@/lib/underwriting/types";

type Loaded = {
  conditions: Condition[];
  medications: Medication;
  search: (query: string, conditions: Condition[], medications: Medication, sheet: "wl" | "tm") => SearchHit[];
};

// The underwriting condition/medication data is ~700KB of JSON — fine for
// the full Underwriting Genie page, which needs all of it anyway, but not
// something every visit to Overview (the default landing page) should pay
// for just in case this tile gets used. Loaded lazily, on first focus, so
// it's a separate chunk rather than part of Overview's own bundle.
async function loadUnderwritingData(): Promise<Loaded> {
  const [{ default: conditions }, { default: medications }, engine] = await Promise.all([
    import("@/data/underwriting/conditions-whole-life.json"),
    import("@/data/underwriting/medications.json"),
    import("@/lib/underwriting/engine"),
  ]);
  return { conditions: conditions as Condition[], medications: medications as Medication, search: engine.search };
}

const MAX_HITS = 5;

/** Read-only condition/medication name lookup — no eligibility verdict
 *  computed here, just "does this exist and what sheet maps it," since
 *  reimplementing even part of actual insurance-eligibility banding logic
 *  in a small tile is a correctness risk the full tool's intake form
 *  (age, build, tobacco, per-condition years-since/current) exists to
 *  avoid. Each result deep-links into the full page with the same query
 *  pre-filled. */
export function UnderwritingGenieMini() {
  const [query, setQuery] = useState("");
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);

  async function ensureLoaded() {
    if (loaded || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      setLoaded(await loadUnderwritingData());
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }

  const trimmed = query.trim();
  const hits = loaded && trimmed ? loaded.search(query, loaded.conditions, loaded.medications, "wl").slice(0, MAX_HITS) : [];

  return (
    <Card data-tour="underwriting-genie-widget" className="flex h-full flex-col p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-[18px] w-[18px]" style={{ color: "var(--copper-metal-hi)" }} />
          <h3 className="font-condensed text-[15.5px] font-extrabold tracking-wide text-white uppercase">Underwriting Genie</h3>
        </div>
        <Link href="/underwriting-genie" className="font-condensed text-[11px] font-bold tracking-wide text-teal-light uppercase hover:underline">
          Open
        </Link>
      </div>

      <Input
        placeholder="Search a condition or medication..."
        value={query}
        onFocus={() => void ensureLoaded()}
        onChange={(e) => {
          setQuery(e.target.value);
          void ensureLoaded();
        }}
      />

      {loading && <p className="mt-2 text-xs text-muted">Loading...</p>}

      {hits.length > 0 ? (
        <div className="mt-3 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
          {hits.map((hit) => (
            <Link
              key={`${hit.type}-${hit.id}`}
              href={`/underwriting-genie?q=${encodeURIComponent(hit.name)}`}
              className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.02] px-2.5 py-1.5 transition-colors hover:bg-white/[0.05]"
            >
              <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">{hit.name}</span>
              <span className="font-condensed shrink-0 text-[9px] font-extrabold tracking-wide text-muted uppercase">
                {hit.type === "condition" ? "Condition" : "Medication"}
              </span>
            </Link>
          ))}
        </div>
      ) : !loading && loaded && trimmed ? (
        <p className="mt-2 text-xs text-muted">No matches — try the full tool for a broader search.</p>
      ) : !trimmed ? (
        <p className="mt-2 text-xs text-muted">Quick condition/medication lookup — open the full tool for a banded verdict.</p>
      ) : null}
    </Card>
  );
}
