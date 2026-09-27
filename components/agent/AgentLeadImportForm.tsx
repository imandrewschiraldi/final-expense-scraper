"use client";

import { useRef, useState, ChangeEvent } from "react";
import { Button } from "@/components/ui/Button";
import { sniffCsvHeaders } from "@/lib/csvHeaders";
import { guessMapping, mappingIsComplete, type MappingState } from "@/lib/csvMapping";
import { ColumnSelect } from "@/components/shared/ColumnSelect";
import { LEAD_TYPES, LEAD_TYPE_LABELS, type LeadType } from "@/lib/leadType";

type ImportResult = {
  imported: number;
  skippedDuplicates: number;
  errors: { line: number; message: string }[];
  duplicates: { line: number; firstName: string; lastName: string; phone: string; reason: "in_file" | "already_imported" }[];
};

/**
 * A leaner, single-file version of the admin CSV importer — an agent's own
 * leads land straight in their book (no unassigned/vault destination
 * choice), so this skips the multi-file batching the admin flow needs and
 * just imports the one file picked.
 */
export function AgentLeadImportForm({ onImported }: { onImported: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [headers, setHeaders] = useState<string[] | null>(null);
  const [previewFilename, setPreviewFilename] = useState("");
  const [mapping, setMapping] = useState<MappingState | null>(null);
  const [leadType, setLeadType] = useState<LeadType | "">("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChosen(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setError(null);
    setResult(null);
    if (!file) {
      setHeaders(null);
      setMapping(null);
      return;
    }
    const text = await file.text();
    const detected = sniffCsvHeaders(text);
    setHeaders(detected);
    setPreviewFilename(file.name);
    setMapping(guessMapping(detected));
  }

  async function submit() {
    const file = fileRef.current?.files?.[0];
    if (!file || !mappingIsComplete(mapping) || !leadType) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("leadType", leadType);
    formData.append(
      "mapping",
      JSON.stringify({
        nameMode: mapping.nameMode,
        nameField: mapping.nameMode === "single" ? mapping.nameField : undefined,
        firstNameField: mapping.nameMode === "split" ? mapping.firstNameField : undefined,
        lastNameField: mapping.nameMode === "split" ? mapping.lastNameField : undefined,
        phoneField: mapping.phoneField,
        dobField: mapping.dobField,
        stateField: mapping.stateField,
      }),
    );

    try {
      const res = await fetch("/api/agent/leads/import", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Import failed");
        return;
      }
      setResult(data);
      if (data.imported > 0) onImported();
      if (fileRef.current) fileRef.current.value = "";
      setHeaders(null);
      setMapping(null);
      setLeadType("");
    } catch {
      setError("Network error during upload");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-6 space-y-3 rounded-[10px] border border-copper-dim bg-surface2 p-4">
      <p className="text-sm text-muted">
        Required columns: <span className="text-teal-light">Name</span> (or First Name / Last Name),{" "}
        <span className="text-teal-light">Phone</span>, <span className="text-teal-light">State</span>. Date of
        Birth and other details (email, address, ZIP, beneficiary, etc.) are optional and picked up automatically
        if present. Leads land straight in your book, ready to work. Rows with a phone number already in the
        system are skipped as duplicates.
      </p>

      <label className="block">
        <span className="mb-1 block text-[11px] font-bold tracking-[0.1em] text-muted uppercase">Lead Type</span>
        <select
          value={leadType}
          onChange={(e) => setLeadType(e.target.value as LeadType)}
          disabled={loading}
          className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:border-copper-dim focus:outline-none disabled:opacity-50"
        >
          <option value="">Select lead type...</option>
          {LEAD_TYPES.map((t) => (
            <option key={t} value={t}>
              {LEAD_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </label>

      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        disabled={loading}
        onChange={handleFileChosen}
        className="block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground disabled:opacity-50"
      />

      {headers && mapping && (
        <div className="space-y-3 rounded-lg border border-copper-dim bg-surface p-4">
          <p className="text-xs text-muted">
            Columns detected from <span className="text-copper">{previewFilename}</span>.
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
              label="Date of Birth (optional)"
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

      <Button onClick={submit} disabled={loading || !leadType || !mappingIsComplete(mapping)}>
        {loading ? "Importing..." : "Import Leads"}
      </Button>

      {error && <p className="text-sm text-red-light">{error}</p>}

      {result && (
        <div className="rounded-lg border border-border bg-surface p-3 text-sm">
          <p className="text-muted">
            <span className="text-green-light">{result.imported.toLocaleString()}</span> imported,{" "}
            {result.skippedDuplicates.toLocaleString()} duplicates skipped
            {result.errors.length > 0 && <span className="text-copper">, {result.errors.length} row error(s)</span>}
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-1 max-h-32 space-y-0.5 overflow-y-auto text-xs text-muted">
              {result.errors.slice(0, 50).map((e, i) => (
                <li key={i}>
                  Line {e.line}: {e.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
