// Client-safe column-mapping guesser shared by the admin and agent CSV
// import forms — no `db` import, just string heuristics over a file's
// detected header row.

export type NameMode = "single" | "split";

export type MappingState = {
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

export function guessMapping(headers: string[]): MappingState {
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

export function mappingIsComplete(m: MappingState | null): m is MappingState {
  if (!m) return false;
  const nameOk = m.nameMode === "single" ? !!m.nameField : !!m.firstNameField;
  return nameOk && !!m.phoneField && !!m.dobField && !!m.stateField;
}
