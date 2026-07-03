import Papa from "papaparse";
import { db } from "@/lib/db";
import { resolveStateCode } from "@/lib/usStates";

export type ParsedLeadRow = {
  line: number;
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: Date;
  state: string;
};

export type DuplicateDetail = {
  line: number;
  firstName: string;
  lastName: string;
  phone: string;
  reason: "in_file" | "already_imported";
};

export type CsvParseResult = {
  rows: ParsedLeadRow[];
  errors: { line: number; message: string }[];
};

// Lets an admin explicitly tell us which column in their CSV is which,
// instead of us guessing based on common header names. Field values are
// the raw header text as it appears in the file.
export type ColumnMapping = {
  nameMode: "single" | "split";
  nameField?: string;
  firstNameField?: string;
  lastNameField?: string;
  phoneField: string;
  dobField: string;
  stateField: string;
};

function normalizeHeader(header: string) {
  return header.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/[\s_]+/g, " ");
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function normalizePhone(raw: string) {
  return raw.replace(/[^\d+]/g, "");
}

const CURRENT_YEAR = new Date().getFullYear();

function twoDigitYearToFour(yy: number): number {
  // Leads are adults, so a 2-digit year almost always means "1900s" —
  // only treat it as 2000s if that would still land in the past.
  const asTwoThousands = 2000 + yy;
  return asTwoThousands <= CURRENT_YEAR ? asTwoThousands : 1900 + yy;
}

/**
 * Parses a date of birth from messy real-world CSV data. Tries several
 * common formats (M/D/YYYY, M/D/YY, YYYY-MM-DD, M-D-YYYY, M.D.YYYY)
 * before falling back to native Date parsing. Returns null if nothing
 * works.
 */
function parseFlexibleDate(raw: string): Date | null {
  const value = raw.trim();
  if (!value) return null;

  const slashOrDash = value.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2}|\d{4})$/);
  if (slashOrDash) {
    const [, m, d, y] = slashOrDash;
    const month = Number(m);
    const day = Number(d);
    const year = y.length === 2 ? twoDigitYearToFour(Number(y)) : Number(y);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
      return date;
    }
  }

  const isoLike = value.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
  if (isoLike) {
    const [, y, m, d] = isoLike;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    if (date.getFullYear() === Number(y) && date.getMonth() === Number(m) - 1 && date.getDate() === Number(d)) {
      return date;
    }
  }

  const native = new Date(value);
  if (!Number.isNaN(native.getTime())) return native;

  return null;
}

export function parseLeadsCsv(fileContent: string, mapping?: ColumnMapping): CsvParseResult {
  const parsed = Papa.parse<Record<string, string>>(fileContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: normalizeHeader,
  });

  const rows: ParsedLeadRow[] = [];
  const errors: { line: number; message: string }[] = [];

  const m = mapping
    ? {
        nameMode: mapping.nameMode,
        nameField: mapping.nameField ? normalizeHeader(mapping.nameField) : undefined,
        firstNameField: mapping.firstNameField ? normalizeHeader(mapping.firstNameField) : undefined,
        lastNameField: mapping.lastNameField ? normalizeHeader(mapping.lastNameField) : undefined,
        phoneField: normalizeHeader(mapping.phoneField),
        dobField: normalizeHeader(mapping.dobField),
        stateField: normalizeHeader(mapping.stateField),
      }
    : null;

  parsed.data.forEach((record, index) => {
    const line = index + 2; // header row + 1-indexing

    const name = m
      ? m.nameMode === "single"
        ? record[m.nameField ?? ""]
        : undefined
      : (record["name"] ?? record["full name"]);
    const firstNameField = m ? (m.nameMode === "split" ? record[m.firstNameField ?? ""] : undefined) : record["first name"];
    const lastNameField = m ? (m.nameMode === "split" ? record[m.lastNameField ?? ""] : undefined) : record["last name"];
    const phoneRaw = m ? record[m.phoneField] : (record["phone"] ?? record["phone number"]);
    const dobRaw = m ? record[m.dobField] : (record["date of birth"] ?? record["dob"]);
    const stateRaw = m ? record[m.stateField] : record["state"];

    let firstName = firstNameField?.trim() ?? "";
    let lastName = lastNameField?.trim() ?? "";
    if (!firstName && name) {
      const split = splitName(name);
      firstName = split.firstName;
      lastName = split.lastName;
    }
    // A missing/unparseable name shouldn't block an otherwise-dialable
    // lead — fall back to a placeholder instead of rejecting the row.
    if (!firstName) {
      firstName = "Unknown";
    }

    // Phone is the one field that actually blocks import: we can't call a
    // lead without a valid 10-digit number.
    if (!phoneRaw) {
      errors.push({ line, message: "Missing phone" });
      return;
    }
    const phone = normalizePhone(phoneRaw);
    if (phone.length < 10) {
      errors.push({ line, message: `Invalid phone: ${phoneRaw}` });
      return;
    }

    // Date of birth has to be a real date since it's stored as one, but
    // we try hard to parse whatever format shows up before giving up.
    const dateOfBirth = dobRaw ? parseFlexibleDate(dobRaw) : null;
    if (!dateOfBirth) {
      errors.push({ line, message: dobRaw ? `Invalid date of birth: ${dobRaw}` : "Missing date of birth" });
      return;
    }

    // State: accept abbreviations or full names in any casing. Only
    // falls back to storing the raw value when it's totally unrecognized
    // (e.g. a typo) rather than rejecting the row.
    const resolvedState = resolveStateCode(stateRaw);
    const state = resolvedState ?? stateRaw?.trim().toUpperCase() ?? "";

    rows.push({ line, firstName, lastName, phone, dateOfBirth, state });
  });

  return { rows, errors };
}

const IMPORT_BATCH_SIZE = 5000;

export async function importLeadsFromCsv(
  fileContent: string,
  uploadedById: string,
  filename: string,
  mapping?: ColumnMapping,
) {
  const { rows, errors } = parseLeadsCsv(fileContent, mapping);
  const duplicates: DuplicateDetail[] = [];

  if (rows.length === 0) {
    return { imported: 0, skippedDuplicates: 0, errors, duplicates };
  }

  // Drop duplicate phone numbers within this file itself (keep the first
  // occurrence) before checking against what's already in the database —
  // otherwise two copies of the same lead in one file both pass the
  // against-database check and both get inserted.
  const seenInFile = new Map<string, ParsedLeadRow>();
  const dedupedRows: ParsedLeadRow[] = [];
  for (const row of rows) {
    const firstSeen = seenInFile.get(row.phone);
    if (firstSeen) {
      duplicates.push({
        line: row.line,
        firstName: row.firstName,
        lastName: row.lastName,
        phone: row.phone,
        reason: "in_file",
      });
      continue;
    }
    seenInFile.set(row.phone, row);
    dedupedRows.push(row);
  }

  const existingPhones = new Map<string, { firstName: string; lastName: string }>();
  for (let i = 0; i < dedupedRows.length; i += IMPORT_BATCH_SIZE) {
    const chunk = dedupedRows.slice(i, i + IMPORT_BATCH_SIZE).map((r) => r.phone);
    const existing = await db.lead.findMany({
      where: { phone: { in: chunk } },
      select: { phone: true, firstName: true, lastName: true },
    });
    existing.forEach((l) => existingPhones.set(l.phone, { firstName: l.firstName, lastName: l.lastName }));
  }

  const uniqueRows: ParsedLeadRow[] = [];
  for (const row of dedupedRows) {
    if (existingPhones.has(row.phone)) {
      duplicates.push({
        line: row.line,
        firstName: row.firstName,
        lastName: row.lastName,
        phone: row.phone,
        reason: "already_imported",
      });
      continue;
    }
    uniqueRows.push(row);
  }

  const skippedDuplicates = duplicates.length;

  if (uniqueRows.length === 0) {
    return { imported: 0, skippedDuplicates, errors, duplicates };
  }

  const importRecord = await db.import.create({
    data: {
      filename,
      uploadedById,
      rowCount: uniqueRows.length,
    },
  });

  for (let i = 0; i < uniqueRows.length; i += IMPORT_BATCH_SIZE) {
    const chunk = uniqueRows.slice(i, i + IMPORT_BATCH_SIZE);
    await db.lead.createMany({
      data: chunk.map((row) => ({
        firstName: row.firstName,
        lastName: row.lastName,
        phone: row.phone,
        dateOfBirth: row.dateOfBirth,
        state: row.state,
        sourceImportId: importRecord.id,
      })),
    });
  }

  return { imported: uniqueRows.length, skippedDuplicates, errors, duplicates };
}
