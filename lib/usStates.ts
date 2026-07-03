export const US_STATES = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
  { code: "DC", name: "District of Columbia" },
] as const;

export const US_STATE_CODES: Set<string> = new Set(US_STATES.map((s) => s.code));

const STATE_CODE_BY_NAME: Map<string, string> = new Map(
  US_STATES.map((s) => [s.name.toLowerCase(), s.code]),
);

function levenshteinDistance(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

// Catches misspellings of a full state name (e.g. "Flordia", "Califronia",
// "Massachusets") by finding the closest known state name, as long as it's
// close enough that it's very unlikely to be a coincidence. Short names
// tolerate 1 typo, longer names tolerate 2.
function fuzzyMatchStateName(cleaned: string): string | null {
  const lower = cleaned.toLowerCase();
  if (lower.length < 4) return null;

  let best: { code: string; distance: number; nameLength: number } | null = null;
  for (const s of US_STATES) {
    const name = s.name.toLowerCase();
    const distance = levenshteinDistance(lower, name);
    if (!best || distance < best.distance) {
      best = { code: s.code, distance, nameLength: name.length };
    }
  }
  if (!best) return null;

  const threshold = best.nameLength <= 6 ? 1 : 2;
  return best.distance <= threshold ? best.code : null;
}

/**
 * Resolves a state value from messy real-world CSV data — full names,
 * abbreviations, any casing, stray punctuation/whitespace, or close
 * misspellings of a full name — to a proper two-letter code. Returns
 * null only when the value doesn't match any known state at all (e.g.
 * blank, or complete garbage).
 */
export function resolveStateCode(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const cleaned = raw.trim().replace(/[.,]/g, "");
  if (!cleaned) return null;

  const upper = cleaned.toUpperCase();
  if (US_STATE_CODES.has(upper)) return upper;

  const byName = STATE_CODE_BY_NAME.get(cleaned.toLowerCase());
  if (byName) return byName;

  return fuzzyMatchStateName(cleaned);
}
