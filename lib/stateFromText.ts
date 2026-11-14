const STATE_NAMES: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District of Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  PR: "Puerto Rico",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};

// Finds a US state anywhere in free text — tried full name first (e.g.
// "Florida"), then an exact-uppercase 2-letter abbreviation (e.g. "FL").
// The abbreviation check is case-SENSITIVE on purpose: matching
// case-insensitively would treat ordinary words like "in" or "or" as
// Indiana/Oregon in everyday phrasing ("Wells Fargo in Parrish").
export function extractStateFromText(
  text: string,
): { abbr: string; name: string } | null {
  for (const [abbr, name] of Object.entries(STATE_NAMES)) {
    if (new RegExp(`\\b${name}\\b`, "i").test(text)) return { abbr, name };
  }
  const abbrTokens = text.match(/\b[A-Z]{2}\b/g) ?? [];
  for (const token of abbrTokens) {
    if (STATE_NAMES[token]) return { abbr: token, name: STATE_NAMES[token] };
  }
  return null;
}

// Best-effort guess at just the bank name portion of a free-text query,
// for building a "<bank> <state>" fallback search that drops a small
// town/city name the live search otherwise can't find anything indexed
// under (e.g. "Wells Fargo in Parrish, Florida" -> "Wells Fargo").
export function guessBankName(query: string): string {
  const inMatch = query.match(/^(.*?)\s+in\s+/i);
  if (inMatch) return inMatch[1].trim();
  const commaIdx = query.indexOf(",");
  if (commaIdx > -1) return query.slice(0, commaIdx).trim();
  return query.trim();
}
