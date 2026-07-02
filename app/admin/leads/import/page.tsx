"use client";

import { useRef, useState, FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";

type ImportResult = {
  imported: number;
  skippedDuplicates: number;
  errors: { line: number; message: string }[];
};

export default function ImportLeadsPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/admin/leads/import", { method: "POST", body: formData });
    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Import failed");
      return;
    }

    setResult(await res.json());
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold uppercase tracking-wide text-foreground">Import Leads</h1>

      <Card>
        <CardHeader>
          <CardTitle>Upload CSV</CardTitle>
        </CardHeader>
        <p className="mb-4 text-sm text-muted">
          Columns expected: <span className="text-teal-light">Name</span> (or First Name / Last Name),{" "}
          <span className="text-teal-light">Phone</span>, <span className="text-teal-light">Date of Birth</span>,{" "}
          <span className="text-teal-light">State</span>. Rows with a phone number already in the system are
          skipped as duplicates.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            required
            className="block w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-foreground"
          />
          <Button type="submit" disabled={loading}>
            {loading ? "Importing..." : "Import Leads"}
          </Button>
        </form>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        {result && (
          <div className="mt-6 space-y-3 border-t border-border pt-4">
            <p className="text-sm">
              <span className="font-semibold text-green-light">{result.imported.toLocaleString()}</span> leads
              imported.{" "}
              {result.skippedDuplicates > 0 && (
                <span className="text-muted">{result.skippedDuplicates} duplicate phone numbers skipped.</span>
              )}
            </p>
            {result.errors.length > 0 && (
              <div>
                <p className="mb-1 text-sm text-copper-light">
                  {result.errors.length} row(s) had errors and were not imported:
                </p>
                <ul className="max-h-48 space-y-1 overflow-y-auto text-xs text-muted">
                  {result.errors.slice(0, 50).map((e, i) => (
                    <li key={i}>
                      Line {e.line}: {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
