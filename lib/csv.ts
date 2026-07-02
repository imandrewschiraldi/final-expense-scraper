import Papa from "papaparse";
import { db } from "@/lib/db";

const US_STATE_CODES = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL",
  "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT",
  "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI",
  "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC",
]);

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

function normalizeHeader(header: string) {
  return header.trim().toLowerCase().replace(/[\s_]+/g, " ");
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

export function parseLeadsCsv(fileContent: string): CsvParseResult {
  const parsed = Papa.parse<Record<string, string>>(fileContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: normalizeHeader,
  });

  const rows: ParsedLeadRow[] = [];
  const errors: { line: number; message: string }[] = [];

  parsed.data.forEach((record, index) => {
    const line = index + 2; // header row + 1-indexing

    const name = record["name"] ?? record["full name"];
    const firstNameField = record["first name"];
    const lastNameField = record["last name"];
    const phoneRaw = record["phone"] ?? record["phone number"];
    const dobRaw = record["date of birth"] ?? record["dob"];
    const stateRaw = record["state"];

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

const IMPORT_BATCH_SIZE = 1000;

export async function importLeadsFromCsv(
  fileContent: string,
  uploadedById: string,
  filename: string,
) {
  const { rows, errors } = parseLeadsCsv(fileContent);

  if (rows.length === 0) {
    return { imported: 0, skippedDuplicates: 0, errors };
  }

  const existingPhones = new Set<string>();
  for (let i = 0; i < rows.length; i += IMPORT_BATCH_SIZE) {
    const chunk = rows.slice(i, i + IMPORT_BATCH_SIZE).map((r) => r.phone);
    const existing = await db.lead.findMany({
      where: { phone: { in: chunk } },
      select: { phone: true },
    });
    existing.forEach((l) => existingPhones.add(l.phone));
  }

  const uniqueRows = rows.filter((r) => !existingPhones.has(r.phone));
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
