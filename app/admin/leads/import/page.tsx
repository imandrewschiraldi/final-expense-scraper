"use client";

import { useRef, useState, FormEvent, ChangeEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { sniffCsvHeaders } from "@/lib/csvHeaders";
import { LEAD_TYPES, LEAD_TYPE_LABELS, type LeadType } from "@/lib/leadType";

type ImportResult = {
  imported: number;
  skippedDuplicates: number;
  errors: { line: number; message: string }[];
  duplicates: { line: number; firstName: string; lastName: string; phone: string; reason: "in_file" | "already_imported" }[];
};

type FileResult = {
  filename: string;
} & ({ status: "ok"; result: ImportResult } | { status: "error"; error: string });

type NameMode = "single" | "split";

type MappingState = {
  nameMode: NameMode;
  nameField: string;
  firstNameField: string;
  lastNameField: string;
  phoneField: string;
  dobField: string;
  stateField: string;
};

function guessField(headers: string[], candidates: string[]): string {
  const normalized = headers.map((h) => ({ raw: h, norm: h.trim().toLowerCase().replace(/[\s_]+/g, " ") }));
  for (const candidate of candidates) {
    const match = normalized.find((h) => h.norm === candidate);
    if (match) return match.raw;
  }
  for (const candidate of candidates) {
    const match = normalized.find((h) => h.norm.includes(candidate));
    if (match) return match.raw;
  }
  return "";
}

function guessMapping(headers: string[]): MappingState {
  const firstNameField = guessField(headers, ["first name", "firstname", "first"]);
  const lastNameField = guessField(headers, ["last name", "lastname", "last"]);
  const nameField = guessField(headers, ["name", "full name", "client name", "lead name"]);
  return {
    nameMode: firstNameField ? "split" : "single",
    nameField: firstNameField ? "" : nameField,
    firstNameField,
    lastNameField,
    phoneField: guessField(headers, ["phone", "phone number", "cell", "mobile"]),
    dobField: guessField(headers, ["date of birth", "dob", "birth date", "birthdate"]),
    stateField: guessField(headers, ["state"]),
  };
}

export default function ImportLeadsPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ index: number; total: number; filename: string } | null>(null);
  const [fileResults, setFileResults] = useState<FileResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[] | null>(null);
  const [previewFilename, setPreviewFilename] = useState<string>("");
  const [mapping, setMapping] = useState<MappingState | null>(null);
  const [leadType, setLeadType] = useState<LeadType | "">("");
  const [destination, setDestination] = useState<"unassigned" | "vault">("unassigned");

  async function handleFilesChosen(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    setError(null);
    setFileResults(null);
    if (!files || files.length === 0) {
      setHeaders(null);
      setMapping(null);
      return;
    }
    const first = files[0];
    const text = await first.text();
    const detected = sniffCsvHeaders(text);
    setHeaders(detected);
    setPreviewFilename(first.name);
    setMapping(guessMapping(detected));
  }

  function mappingIsComplete(m: MappingState | null): m is MappingState {
    if (!m) return false;
    const nameOk = m.nameMode === "single" ? !!m.nameField : !!m.firstNameField;
    return nameOk && !!m.phoneField && !!m.dobField && !!m.stateField;
  }

  async function importOneFile(
    file: File,
    columnMapping: MappingState,
    selectedLeadType: LeadType,
    selectedDestination: "unassigned" | "vault",
  ): Promise<FileResult> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("leadType", selectedLeadType);
    formData.append("destination", selectedDestination);
    formData.append(
      "mapping",
      JSON.stringify({
        nameMode: columnMapping.nameMode,
        nameField: columnMapping.nameMode === "single" ? columnMapping.nameField : undefined,
        firstNameField: columnMapping.nameMode === "split" ? columnMapping.firstNameField : undefined,
        lastNameField: columnMapping.nameMode === "split" ? columnMapping.lastNameField : undefined,
        phoneField: columnMapping.phoneField,
        dobField: columnMapping.dobField,
        stateField: columnMapping.stateField,
      }),
    );

    try {
      const res = await fetch("/api/admin/leads/import", { method: "POST", body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return { filename: file.name, status: "error", error: body.error ?? "Import failed" };
      }
      return { filename: file.name, status: "ok", result: await res.json() };
    } catch {
      return { filename: file.name, status: "error", error: "Network error during upload" };
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const files = fileRef.current?.files;
    if (!files || files.length === 0) return;
    if (!mappingIsComplete(mapping)) {
      setError("Finish mapping every column before importing.");
      return;
    }
    if (!leadType) {
      setError("Select a lead type before importing.");
      return;
    }

    setLoading(true);
    setError(null);
    setFileResults([]);

    const results: FileResult[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress({ index: i + 1, total: files.length, filename: file.name });
      const result = await importOneFile(file, mapping, leadType, destination);
      results.push(result);
      setFileResults([...results]);
    }

    setProgress(null);
    setLoading(false);
    if (fileRef.current) fileRef.current.value = "";
    setHeaders(null);
    setMapping(null);
    setLeadType("");
    setDestination("unassigned");
  }

  const totals = fileResults?.reduce(
    (acc, f) => {
      if (f.status === "ok") {
        acc.imported += f.result.imported;
        acc.skippedDuplicates += f.result.skippedDuplicates;
        acc.errorRows += f.result.errors.length;
      } else {
        acc.failedFiles += 1;
      }
      return acc;
    },
    { imported: 0, skippedDuplicates: 0, errorRows: 0, failedFiles: 0 },
  );

  return (
    <div className="max-w-2xl">
      <h1 className="font-condensed mb-6 text-2xl font-extrabold tracking-wide text-white uppercase">Import Leads</h1>

      <Card>
        <CardHeader>
          <CardTitle>Upload CSV</CardTitle>
        </CardHeader>
        <p className="mb-4 text-sm text-muted">
          Columns expected: <span className="text-orange-light">Name</span> (or First Name / Last Name),{" "}
          <span className="text-orange-light">Phone</span>, <span className="text-orange-light">Date of Birth</span>,{" "}
          <span className="text-orange-light">State</span>. Rows with a phone number already in the system (or
          already in another file you're uploading in the same batch) are skipped as duplicates. You can select
          multiple CSV files at once — they'll be imported one after another.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold tracking-[0.1em] text-muted uppercase">
              Lead Type
            </span>
            <select
              value={leadType}
              onChange={(e) => setLeadType(e.target.value as LeadType)}
              disabled={loading}
              required
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:border-copper-dim focus:outline-none disabled:opacity-50"
            >
              <option value="">Select lead type...</option>
              {LEAD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {LEAD_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-muted">
              Every file in this batch is imported as this lead type. Import types separately if you have more
              than one.
            </span>
          </label>

          <div>
            <span className="mb-1 block text-[11px] font-bold tracking-[0.1em] text-muted uppercase">
              Destination
            </span>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="radio"
                  checked={destination === "unassigned"}
                  onChange={() => setDestination("unassigned")}
                />
                Unassigned pool (available for normal assignment)
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="radio" checked={destination === "vault"} onChange={() => setDestination("vault")} />
                Vault (shared pool every agent can call)
              </label>
            </div>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            multiple
            required
            disabled={loading}
            onChange={handleFilesChosen}
            className="block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground disabled:opacity-50"
          />

          {headers && mapping && (
            <div className="space-y-3 rounded-lg border border-copper-dim bg-surface2 p-4">
              <p className="text-xs text-muted">
                Columns detected from <span className="text-copper">{previewFilename}</span> — this mapping is
                applied to every file you upload in this batch.
              </p>

              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={mapping.nameMode === "split"}
                    onChange={() => setMapping({ ...mapping, nameMode: "split" })}
                  />
                  First / Last in separate columns
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={mapping.nameMode === "single"}
                    onChange={() => setMapping({ ...mapping, nameMode: "single" })}
                  />
                  Full name in one column
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {mapping.nameMode === "split" ? (
                  <>
                    <ColumnSelect
                      label="First Name"
                      value={mapping.firstNameField}
                      headers={headers}
                      onChange={(v) => setMapping({ ...mapping, firstNameField: v })}
                    />
                    <ColumnSelect
                      label="Last Name"
                      value={mapping.lastNameField}
                      headers={headers}
                      onChange={(v) => setMapping({ ...mapping, lastNameField: v })}
                    />
                  </>
                ) : (
                  <ColumnSelect
                    label="Full Name"
                    value={mapping.nameField}
                    headers={headers}
                    onChange={(v) => setMapping({ ...mapping, nameField: v })}
                  />
                )}
                <ColumnSelect
                  label="Phone"
                  value={mapping.phoneField}
                  headers={headers}
                  onChange={(v) => setMapping({ ...mapping, phoneField: v })}
                />
                <ColumnSelect
                  label="Date of Birth"
                  value={mapping.dobField}
                  headers={headers}
                  onChange={(v) => setMapping({ ...mapping, dobField: v })}
                />
                <ColumnSelect
                  label="State"
                  value={mapping.stateField}
                  headers={headers}
                  onChange={(v) => setMapping({ ...mapping, stateField: v })}
                />
              </div>
            </div>
          )}

          <Button type="submit" disabled={loading || !leadType || !mappingIsComplete(mapping)}>
            {loading ? "Importing..." : "Import Leads"}
          </Button>
        </form>

        {error && <p className="mt-4 text-sm text-red-light">{error}</p>}

        {progress && (
          <p className="mt-4 text-sm text-muted">
            Importing file {progress.index} of {progress.total}: <span className="text-copper">{progress.filename}</span>
          </p>
        )}

        {fileResults && fileResults.length > 0 && totals && (
          <div className="mt-6 space-y-4 border-t border-border pt-4">
            {!loading && (
              <p className="text-sm">
                <span className="font-semibold text-green-light">{totals.imported.toLocaleString()}</span> leads
                imported across {fileResults.length} file{fileResults.length === 1 ? "" : "s"}.{" "}
                {totals.skippedDuplicates > 0 && (
                  <span className="text-muted">{totals.skippedDuplicates.toLocaleString()} duplicates skipped.</span>
                )}{" "}
                {totals.failedFiles > 0 && (
                  <span className="text-red-light">{totals.failedFiles} file(s) failed to upload.</span>
                )}
              </p>
            )}

            <div className="space-y-2">
              {fileResults.map((f, i) => (
                <div key={i} className="rounded-lg border border-border bg-surface2 p-3 text-sm">
                  <p className="font-semibold text-white">{f.filename}</p>
                  {f.status === "ok" ? (
                    <>
                      <p className="text-muted">
                        <span className="text-green-light">{f.result.imported.toLocaleString()}</span> imported,{" "}
                        {f.result.skippedDuplicates.toLocaleString()} duplicates skipped
                        {f.result.errors.length > 0 && (
                          <span className="text-copper">, {f.result.errors.length} row error(s)</span>
                        )}
                      </p>
                      {f.result.errors.length > 0 && (
                        <ul className="mt-1 max-h-32 space-y-0.5 overflow-y-auto text-xs text-muted">
                          {f.result.errors.slice(0, 50).map((e, j) => (
                            <li key={j}>
                              Line {e.line}: {e.message}
                            </li>
                          ))}
                        </ul>
                      )}
                      {f.result.duplicates.length > 0 && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-xs text-orange-light hover:underline">
                            Show which {f.result.duplicates.length} row(s) were treated as duplicates
                          </summary>
                          <ul className="mt-1 max-h-48 space-y-0.5 overflow-y-auto text-xs text-muted">
                            {f.result.duplicates.slice(0, 500).map((d, j) => (
                              <li key={j}>
                                Line {d.line}: {d.firstName} {d.lastName} — {d.phone} (
                                {d.reason === "in_file"
                                  ? "repeated within this file"
                                  : "phone already exists in the database"}
                                )
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </>
                  ) : (
                    <p className="text-red-light">{f.error}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function ColumnSelect({
  label,
  value,
  headers,
  onChange,
}: {
  label: string;
  value: string;
  headers: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold tracking-[0.1em] text-muted uppercase">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm text-foreground focus:border-copper-dim focus:outline-none"
      >
        <option value="">Select column...</option>
        {headers.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
    </label>
  );
}
