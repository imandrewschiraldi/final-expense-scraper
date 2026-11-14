// Standard ZIP3-prefix-to-state ranges (the same public USPS-derived
// table used by most zip/state lookup libraries). Used only to help the
// Routing Number Genie live search find pages indexed by state/city name
// rather than raw ZIP digits — not for anything compliance-sensitive, so
// approximate range edges are fine.
const ZIP3_RANGES: Array<{
  start: number;
  end: number;
  abbr: string;
  name: string;
}> = [
  { start: 6, end: 9, abbr: "PR", name: "Puerto Rico" },
  { start: 10, end: 27, abbr: "MA", name: "Massachusetts" },
  { start: 28, end: 29, abbr: "RI", name: "Rhode Island" },
  { start: 30, end: 38, abbr: "NH", name: "New Hampshire" },
  { start: 39, end: 49, abbr: "ME", name: "Maine" },
  { start: 50, end: 59, abbr: "VT", name: "Vermont" },
  { start: 60, end: 69, abbr: "CT", name: "Connecticut" },
  { start: 70, end: 89, abbr: "NJ", name: "New Jersey" },
  { start: 100, end: 149, abbr: "NY", name: "New York" },
  { start: 150, end: 196, abbr: "PA", name: "Pennsylvania" },
  { start: 197, end: 199, abbr: "DE", name: "Delaware" },
  { start: 200, end: 205, abbr: "DC", name: "District of Columbia" },
  { start: 206, end: 219, abbr: "MD", name: "Maryland" },
  { start: 220, end: 246, abbr: "VA", name: "Virginia" },
  { start: 247, end: 268, abbr: "WV", name: "West Virginia" },
  { start: 270, end: 289, abbr: "NC", name: "North Carolina" },
  { start: 290, end: 299, abbr: "SC", name: "South Carolina" },
  { start: 300, end: 319, abbr: "GA", name: "Georgia" },
  { start: 320, end: 349, abbr: "FL", name: "Florida" },
  { start: 350, end: 369, abbr: "AL", name: "Alabama" },
  { start: 370, end: 385, abbr: "TN", name: "Tennessee" },
  { start: 386, end: 397, abbr: "MS", name: "Mississippi" },
  { start: 398, end: 399, abbr: "GA", name: "Georgia" },
  { start: 400, end: 427, abbr: "KY", name: "Kentucky" },
  { start: 430, end: 458, abbr: "OH", name: "Ohio" },
  { start: 460, end: 479, abbr: "IN", name: "Indiana" },
  { start: 480, end: 499, abbr: "MI", name: "Michigan" },
  { start: 500, end: 528, abbr: "IA", name: "Iowa" },
  { start: 530, end: 549, abbr: "WI", name: "Wisconsin" },
  { start: 550, end: 567, abbr: "MN", name: "Minnesota" },
  { start: 570, end: 577, abbr: "SD", name: "South Dakota" },
  { start: 580, end: 588, abbr: "ND", name: "North Dakota" },
  { start: 590, end: 599, abbr: "MT", name: "Montana" },
  { start: 600, end: 629, abbr: "IL", name: "Illinois" },
  { start: 630, end: 658, abbr: "MO", name: "Missouri" },
  { start: 660, end: 679, abbr: "KS", name: "Kansas" },
  { start: 680, end: 693, abbr: "NE", name: "Nebraska" },
  { start: 700, end: 714, abbr: "LA", name: "Louisiana" },
  { start: 716, end: 729, abbr: "AR", name: "Arkansas" },
  { start: 730, end: 749, abbr: "OK", name: "Oklahoma" },
  { start: 750, end: 799, abbr: "TX", name: "Texas" },
  { start: 800, end: 816, abbr: "CO", name: "Colorado" },
  { start: 820, end: 831, abbr: "WY", name: "Wyoming" },
  { start: 832, end: 838, abbr: "ID", name: "Idaho" },
  { start: 840, end: 847, abbr: "UT", name: "Utah" },
  { start: 850, end: 865, abbr: "AZ", name: "Arizona" },
  { start: 870, end: 884, abbr: "NM", name: "New Mexico" },
  { start: 889, end: 898, abbr: "NV", name: "Nevada" },
  { start: 900, end: 961, abbr: "CA", name: "California" },
  { start: 967, end: 968, abbr: "HI", name: "Hawaii" },
  { start: 970, end: 979, abbr: "OR", name: "Oregon" },
  { start: 980, end: 994, abbr: "WA", name: "Washington" },
  { start: 995, end: 999, abbr: "AK", name: "Alaska" },
];

export function zipToState(zip: string): { abbr: string; name: string } | null {
  const prefix = parseInt(zip.slice(0, 3), 10);
  if (Number.isNaN(prefix)) return null;
  const match = ZIP3_RANGES.find((r) => prefix >= r.start && prefix <= r.end);
  return match ? { abbr: match.abbr, name: match.name } : null;
}
