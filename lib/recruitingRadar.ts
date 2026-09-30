// Shared config for the Recruiting Radar tool — ported verbatim from the
// reference build (same title lists, market definitions, hot combos, and DM
// copy) so search behavior matches exactly. Used by both the client panel
// (rendering pills, running sweeps) and the server route (looking up a
// category/market id to build the Apollo query).

export type CategoryKey =
  | "d2d"
  | "auto"
  | "highticket"
  | "freight"
  | "funding"
  | "fitness"
  | "insurance";

export type Category = {
  label: string;
  sub: string;
  titles: string[];
  dmIndustry: string;
};

export const CATEGORIES: Record<CategoryKey, Category> = {
  d2d: {
    label: "Door-to-Door",
    sub: "Solar · Pest · Alarm",
    titles: [
      "Solar Sales Representative",
      "Solar Consultant",
      "Door to Door Sales Representative",
      "Pest Control Sales Representative",
      "Alarm Sales Representative",
      "Canvasser",
      "Field Sales Representative",
    ],
    dmIndustry: "the door-to-door game",
  },
  auto: {
    label: "Auto Sales",
    sub: "Dealership floor & finance",
    titles: [
      "Automotive Sales Consultant",
      "Car Sales Consultant",
      "Automotive Salesperson",
      "Internet Sales Consultant",
      "Product Specialist",
      "Sales Consultant",
    ],
    dmIndustry: "auto sales",
  },
  highticket: {
    label: "High-Ticket",
    sub: "Closers · Setters · SDR/AE",
    titles: [
      "High Ticket Closer",
      "Remote Closer",
      "Sales Closer",
      "Appointment Setter",
      "Sales Development Representative",
      "Account Executive",
    ],
    dmIndustry: "the closing game",
  },
  freight: {
    label: "Freight",
    sub: "Brokers · Logistics reps",
    titles: [
      "Freight Broker",
      "Logistics Account Executive",
      "Freight Agent",
      "Logistics Sales Representative",
      "Carrier Sales Representative",
      "Account Manager Logistics",
    ],
    dmIndustry: "freight",
  },
  funding: {
    label: "MCA / Biz Funding",
    sub: "Merchant cash advance · Lending",
    titles: [
      "Funding Specialist",
      "Business Funding Advisor",
      "MCA Broker",
      "Merchant Cash Advance Specialist",
      "Business Loan Broker",
      "Funding Advisor",
      "ISO Relations Representative",
    ],
    dmIndustry: "the funding space",
  },
  fitness: {
    label: "Fitness Sales",
    sub: "Trainers · Membership reps",
    titles: [
      "Personal Trainer",
      "Membership Sales Advisor",
      "Fitness Consultant",
      "Membership Consultant",
      "Fitness Sales Representative",
      "Gym Sales Manager",
    ],
    dmIndustry: "fitness",
  },
  insurance: {
    label: "Insurance",
    sub: "Life · Final expense",
    titles: [
      "Life Insurance Agent",
      "Insurance Agent",
      "Final Expense Agent",
      "Insurance Sales Agent",
      "Licensed Insurance Agent",
      "Insurance Broker",
    ],
    dmIndustry: "the insurance game",
  },
};

export type MarketId =
  | "tampa"
  | "miami"
  | "sarasota"
  | "az"
  | "dallas"
  | "austin"
  | "malibu"
  | "newport"
  | "nj"
  | "longisland"
  | "slc"
  | "sandiego"
  | "nashville"
  | "boca"
  | "westpalm"
  | "ftl";

export type Market = { id: MarketId; label: string; locations: string[] };

export const MARKETS: Market[] = [
  { id: "tampa", label: "Tampa, FL", locations: ["Tampa, Florida"] },
  { id: "miami", label: "Miami, FL", locations: ["Miami, Florida"] },
  { id: "sarasota", label: "Sarasota, FL", locations: ["Sarasota, Florida"] },
  { id: "az", label: "Scottsdale, AZ", locations: ["Scottsdale, Arizona", "Phoenix, Arizona"] },
  { id: "dallas", label: "Dallas, TX", locations: ["Dallas, Texas"] },
  { id: "austin", label: "Austin, TX", locations: ["Austin, Texas"] },
  { id: "malibu", label: "Malibu, CA", locations: ["Malibu, California"] },
  { id: "newport", label: "Newport Beach, CA", locations: ["Newport Beach, California"] },
  { id: "nj", label: "New Jersey", locations: ["New Jersey, US"] },
  { id: "longisland", label: "Long Island, NY", locations: ["Long Island, New York"] },
  { id: "slc", label: "Salt Lake, UT", locations: ["Salt Lake City, Utah", "Provo, Utah", "Lehi, Utah"] },
  { id: "sandiego", label: "San Diego, CA", locations: ["San Diego, California"] },
  { id: "nashville", label: "Nashville, TN", locations: ["Nashville, Tennessee"] },
  { id: "boca", label: "Boca Raton, FL", locations: ["Boca Raton, Florida"] },
  { id: "westpalm", label: "West Palm, FL", locations: ["West Palm Beach, Florida"] },
  { id: "ftl", label: "Fort Lauderdale, FL", locations: ["Fort Lauderdale, Florida"] },
];

export const HOT_COMBOS: [CategoryKey, MarketId][] = [
  ["funding", "boca"],
  ["funding", "westpalm"],
  ["funding", "ftl"],
  ["funding", "longisland"],
  ["freight", "nashville"],
  ["freight", "dallas"],
  ["freight", "tampa"],
  ["d2d", "slc"],
  ["d2d", "tampa"],
  ["d2d", "az"],
  ["insurance", "tampa"],
  ["insurance", "sarasota"],
  ["insurance", "miami"],
  ["insurance", "dallas"],
  ["auto", "miami"],
  ["auto", "tampa"],
  ["auto", "nj"],
  ["highticket", "az"],
  ["highticket", "miami"],
  ["highticket", "austin"],
  ["fitness", "sandiego"],
  ["fitness", "az"],
];

export const RECRUIT_STATUSES = [
  { id: "NEW", label: "To Contact", color: "#8A8A85" },
  { id: "DMD", label: "DM'd", color: "#D98B4A" },
  { id: "REPLIED", label: "Replied", color: "#E8A467" },
  { id: "HIRED", label: "Hired", color: "#E8853D" },
  { id: "PASS", label: "Pass", color: "#4A4A46" },
] as const;

export type RecruitStatusId = (typeof RECRUIT_STATUSES)[number]["id"];

export function isCategoryKey(value: string): value is CategoryKey {
  return value in CATEGORIES;
}

export function isMarketId(value: string): value is MarketId {
  return MARKETS.some((m) => m.id === value);
}

/**
 * Builds the personalized recruiting DM for a prospect — four rotating
 * variants, deterministically assigned via a hash of the dedupe key so
 * re-copying the same prospect always yields the same message.
 */
export function buildRecruitingDm(prospect: {
  name: string;
  location: string;
  market: string;
  category: string;
  dedupeKey: string;
}): string {
  const first = prospect.name.trim().split(" ")[0] || "there";
  const catEntry = Object.values(CATEGORIES).find((c) => c.label === prospect.category);
  const industry = catEntry ? catEntry.dmIndustry : "sales";
  const city = ((prospect.location || prospect.market).split(",")[0] || "").trim();

  const variants = [
    `Hey ${first}, I see you're crushing it in ${industry} over in ${city}. I've been in the life insurance industry for 3 years and I'm building out a team of virtual sales agents. We utilize AI CRMs and setters to minimize our dialing hours and definitely no door knocking lol. I think you'd be a great fit. If you're interested in learning more, let's hop on a call this week.`,
    `What's up ${first}, came across your profile and it looks like you're doing big things in ${industry} out in ${city}. I run a virtual life insurance team, 3 years in the industry, and we're expanding. We utilize AI CRMs and setters to minimize our dialing hours, and definitely no door knocking lol. You've got the exact background we look for. If you're interested in learning more, let's hop on a call this week.`,
    `Hey ${first}, your ${industry} background in ${city} caught my eye. Quick context: I've been in life insurance for 3 years and I'm building a fully remote sales team. We utilize AI CRMs and setters to keep our dialing hours minimal, and definitely no door knocking lol. I think you'd crush it with us. If you're interested in learning more, let's hop on a call this week.`,
    `${first}, saw you're grinding in ${industry} over in ${city} and had to reach out. I'm 3 years into life insurance and building a virtual agent team. We utilize AI CRMs and setters to minimize our dialing hours, and definitely no door knocking lol. You look like a fit. If you're interested in learning more, let's hop on a call this week.`,
  ];

  let hash = 0;
  const key = prospect.dedupeKey || first;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return variants[hash % variants.length];
}
