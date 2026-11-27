// Which extra contact fields show on an opportunity's card/row in Book of
// Business — an agent picks these via "Manage Fields", mirroring
// GoHighLevel's own per-board field picker. Name and Value always show and
// aren't part of this list. Stored per-browser (not per account) since
// it's a display preference, not business data.
export type BookOfBusinessPhase = "LEAD" | "CLIENT";

export const FIELD_OPTIONS: Record<
  BookOfBusinessPhase,
  { key: string; label: string }[]
> = {
  LEAD: [
    { key: "phone", label: "Phone" },
    { key: "state", label: "State" },
    { key: "dateOfBirth", label: "Date of Birth" },
  ],
  CLIENT: [
    { key: "phone", label: "Phone" },
    { key: "state", label: "State" },
    { key: "carrier", label: "Carrier" },
  ],
};

const DEFAULTS: Record<BookOfBusinessPhase, string[]> = {
  LEAD: ["state"],
  CLIENT: ["carrier"],
};

function storageKey(phase: BookOfBusinessPhase) {
  return `bob-card-fields-${phase}`;
}

export function loadFieldPrefs(phase: BookOfBusinessPhase): string[] {
  if (typeof window === "undefined") return DEFAULTS[phase];
  try {
    const raw = window.localStorage.getItem(storageKey(phase));
    if (!raw) return DEFAULTS[phase];
    const parsed = JSON.parse(raw);
    const valid = new Set(FIELD_OPTIONS[phase].map((f) => f.key));
    return Array.isArray(parsed)
      ? parsed.filter((f) => valid.has(f))
      : DEFAULTS[phase];
  } catch {
    return DEFAULTS[phase];
  }
}

export function saveFieldPrefs(phase: BookOfBusinessPhase, fields: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(phase), JSON.stringify(fields));
  } catch {
    // Private browsing / storage blocked — the preference just won't persist.
  }
}
