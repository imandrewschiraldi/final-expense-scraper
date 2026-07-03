import Papa from "papaparse";

// Client-safe: no server-only imports, so this can run in the browser to
// preview a file's columns before upload.
export function sniffCsvHeaders(fileContent: string): string[] {
  const parsed = Papa.parse<string[]>(fileContent, { preview: 1 });
  return (parsed.data[0] ?? []).map((h) => h.replace(/^﻿/, "").trim());
}
