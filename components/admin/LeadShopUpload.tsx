"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FileDropZone } from "@/components/shared/FileDropZone";
import { guessMapping } from "@/lib/csvMapping";

const CHUNK = 2500;

function guess(headers: string[], candidates: string[]) {
  const norm = headers.map((h) => ({ raw: h, n: h.trim().toLowerCase().replace(/[\s_]+/g, " ") }));
  for (const c of candidates) {
    const m = norm.find((h) => h.n === c) ?? norm.find((h) => h.n.includes(c));
    if (m) return m.raw;
  }
  return "";
}

type Totals = { inserted: number; duplicates: number; invalid: number };

export function LeadShopUpload() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload() {
    if (!file) return;
    setError(null);
    setTotals(null);
    const text = await file.text();
    const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
    const headers = (parsed.meta.fields ?? []).map((h) => h.replace(/^﻿/, ""));
    const m = guessMapping(headers);
    if (!m.phoneField || !m.stateField || !(m.firstNameField || m.nameField)) {
      setError("This file needs columns for name, phone, and state. Check the header row and try again.");
      return;
    }
    const f = {
      email: guess(headers, ["email", "e-mail"]),
      address: guess(headers, ["address", "street"]),
      zip: guess(headers, ["zip", "postal"]),
      county: guess(headers, ["county"]),
      gender: guess(headers, ["gender", "sex"]),
      militaryBranch: guess(headers, ["military branch", "branch", "military"]),
    };
    const pick = (r: Record<string, string>, k: string) => (k ? (r[k] ?? r["﻿" + k]) : undefined);
    const rows = parsed.data.map((r) => ({
      firstName: pick(r, m.firstNameField),
      lastName: pick(r, m.lastNameField),
      name: m.firstNameField ? undefined : pick(r, m.nameField),
      phone: pick(r, m.phoneField),
      state: pick(r, m.stateField),
      dob: pick(r, m.dobField),
      email: pick(r, f.email),
      address: pick(r, f.address),
      zip: pick(r, f.zip),
      county: pick(r, f.county),
      gender: pick(r, f.gender),
      militaryBranch: pick(r, f.militaryBranch),
    }));

    const sum: Totals = { inserted: 0, duplicates: 0, invalid: 0 };
    setProgress({ done: 0, total: rows.length });
    try {
      for (let i = 0; i < rows.length; i += CHUNK) {
        const res = await fetch("/api/admin/shop/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: rows.slice(i, i + CHUNK) }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? `Upload stopped at row ${i + 1}.`);
        sum.inserted += data.inserted;
        sum.duplicates += data.duplicates;
        sum.invalid += data.invalid;
        setProgress({ done: Math.min(i + CHUNK, rows.length), total: rows.length });
        setTotals({ ...sum });
      }
      router.refresh();
    } catch (e) {
      setError(
        `${e instanceof Error ? e.message : "Upload failed."} Rows already uploaded are saved; uploading the same file again skips them.`,
      );
    } finally {
      setProgress(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload leads to the shop</CardTitle>
      </CardHeader>
      <p className="mb-3 text-sm text-muted">
        CSV with name, phone, and state columns (date of birth, email, address, zip, county, gender, and military
        branch are picked up if present). Leads are split at random into 6+, 9+, and 12+ month groups, about a third
        each. Phones already in the shop are skipped.
      </p>
      <FileDropZone
        inputRef={inputRef}
        accept=".csv,text/csv"
        disabled={!!progress}
        onFilesChosen={(files) => setFile(files?.[0] ?? null)}
        hint="Drop a CSV here or click to choose one"
        selectedLabel={file?.name}
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button type="button" onClick={upload} disabled={!file || !!progress}>
          {progress ? "Uploading…" : "Upload to shop"}
        </Button>
        {progress && (
          <span className="text-sm text-muted tabular-nums">
            {progress.done.toLocaleString("en-US")} of {progress.total.toLocaleString("en-US")} rows
          </span>
        )}
      </div>
      {totals && (
        <p className="mt-3 text-sm tabular-nums">
          <span className="text-green-light">{totals.inserted.toLocaleString("en-US")} added</span>
          <span className="text-muted">
            {" "}
            · {totals.duplicates.toLocaleString("en-US")} already in the shop · {totals.invalid.toLocaleString("en-US")}{" "}
            missing a name, valid phone, or state
          </span>
        </p>
      )}
      {error && <p className="mt-3 text-sm text-red-light">{error}</p>}
    </Card>
  );
}
