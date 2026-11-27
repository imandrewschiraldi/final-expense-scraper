// A short, curated list rather than every IANA zone (Intl.supportedValuesOf
// returns ~400) — this agency operates across the mainland + AK/HI, so a
// handful of named US zones covers every real case without an unusably
// long dropdown.
export const TIME_ZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Phoenix", label: "Arizona (no DST)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
] as const;

export type TimeZoneValue = (typeof TIME_ZONES)[number]["value"];
