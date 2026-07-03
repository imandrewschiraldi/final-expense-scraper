"use client";

import { useRef, useState, FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";

type ImportResult = {
  imported: number;
  skippedDuplicates: number;
  errors: { line: number; message: string }[];
};

type FileResult = {
  filename: string;
} & ({ status: "ok"; result: ImportResult } | { status: "error"; error: string });

export default function ImportLeadsPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ index: number; total: number; filename: string } | null>(null);
  const [fileResults, setFileResults] = useState<FileResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function importOneFile(file: File): Promise<FileResult> {
    const formData = new FormData();
    formData.append("file", file);

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

    setLoading(true);
    setError(null);
    setFileResults([]);

    const results: FileResult[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress({ index: i + 1, total: files.length, filename: file.name });
      const result = await importOneFile(file);
      results.push(result);
      setFileResults([...results]);
    }

    setProgress(null);
    setLoading(false);
    if (fileRef.current) fileRef.current.value = "";
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
          Columns expected: <span className="text-teal-light">Name</span> (or First Name / Last Name),{" "}
          <span className="text-teal-light">Phone</span>, <span className="text-teal-light">Date of Birth</span>,{" "}
          <span className="text-teal-light">State</span>. Rows with a phone number already in the system (or
          already in another file you're uploading in the same batch) are skipped as duplicates. You can select
          multiple CSV files at once — they'll be imported one after another.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            multiple
            required
            disabled={loading}
            className="block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground disabled:opacity-50"
          />
          <Button type="submit" disabled={loading}>
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
