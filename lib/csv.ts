import Papa from "papaparse";
import { db } from "@/lib/db";
import { US_STATE_CODES } from "@/lib/usStates";

export type ParsedLeadRow = {
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: Date;
  state: string;
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

    if (!firstName) {
      errors.push({ line, message: "Missing name" });
      return;
    }

    if (!phoneRaw) {
      errors.push({ line, message: "Missing phone" });
      return;
    }
    const phone = normalizePhone(phoneRaw);
    if (phone.length < 10) {
      errors.push({ line, message: `Invalid phone: ${phoneRaw}` });
      return;
    }

    if (!dobRaw) {
      errors.push({ line, message: "Missing date of birth" });
      return;
    }
    const dateOfBirth = new Date(dobRaw);
    if (Number.isNaN(dateOfBirth.getTime())) {
      errors.push({ line, message: `Invalid date of birth: ${dobRaw}` });
      return;
    }

    const state = stateRaw?.trim().toUpperCase() ?? "";
    if (!US_STATE_CODES.has(state)) {
      errors.push({ line, message: `Invalid state: ${stateRaw}` });
      return;
    }

    rows.push({ firstName, lastName, phone, dateOfBirth, state });
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

  if (rows.length === 0) {
    return { imported: 0, skippedDuplicates: 0, errors };
  }

  // Drop duplicate phone numbers within this file itself (keep the first
  // occurrence) before checking against what's already in the database —
  // otherwise two copies of the same lead in one file both pass the
  // against-database check and both get inserted.
  const seenInFile = new Set<string>();
  const dedupedRows: ParsedLeadRow[] = [];
  for (const row of rows) {
    if (seenInFile.has(row.phone)) continue;
    seenInFile.add(row.phone);
    dedupedRows.push(row);
  }

  const existingPhones = new Set<string>();
  for (let i = 0; i < dedupedRows.length; i += IMPORT_BATCH_SIZE) {
    const chunk = dedupedRows.slice(i, i + IMPORT_BATCH_SIZE).map((r) => r.phone);
    const existing = await db.lead.findMany({
      where: { phone: { in: chunk } },
      select: { phone: true },
    });
    existing.forEach((l) => existingPhones.add(l.phone));
  }

  const uniqueRows = dedupedRows.filter((r) => !existingPhones.has(r.phone));
  const skippedDuplicates = rows.length - uniqueRows.length;

  if (uniqueRows.length === 0) {
    return { imported: 0, skippedDuplicates, errors };
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

  return { imported: uniqueRows.length, skippedDuplicates, errors };
}
