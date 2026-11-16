// Maps a carrier's display name (Carrier.name, or Policy.carrier free text,
// which doesn't always match it exactly) to its logo file under
// public/carrier-logos/. Matched by normalized name rather than a DB column
// — there are only a handful of real carrier logos, and this way dropping a
// new PNG in never needs a migration.
const CARRIER_LOGO_FILES: Record<string, string> = {
  athene: "athene.png",
  "f&g": "fg.png",
  fg: "fg.png",
  corebridge: "corebridge.png",
  "corebridge financial": "corebridge.png",
  americo: "americo.png",
  transamerica: "transamerica.png",
  "national life": "national-life.png",
  "national life group": "national-life.png",
  "american amicable": "american-amicable.png",
  "american amicable group": "american-amicable.png",
  "mutual of omaha": "mutual-of-omaha.png",
  foresters: "foresters.png",
  "foresters financial": "foresters.png",
  "liberty bankers": "liberty-bankers.png",
  "liberty bankers insurance group": "liberty-bankers.png",
  "royal neighbors": "royal-neighbors.png",
  "royal neighbors of america": "royal-neighbors.png",
  "united home life": "united-home-life.png",
  "united home life insurance company": "united-home-life.png",
  "american home life": "american-home-life.png",
  "american home life insurance company": "american-home-life.png",
  "kansas city life": "kansas-city-life.png",
  aetna: "aetna.png",
  aflac: "aflac.png",
  chubb: "chubb.png",
  ethos: "ethos.png",
};

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9& ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function getCarrierLogoFile(name: string): string | null {
  const normalized = normalize(name);
  if (CARRIER_LOGO_FILES[normalized]) return CARRIER_LOGO_FILES[normalized];
  // A longer official name ("Mutual of Omaha Insurance Company") still
  // matches the shorter key it starts with ("mutual of omaha").
  for (const [key, file] of Object.entries(CARRIER_LOGO_FILES)) {
    if (normalized.startsWith(key)) return file;
  }
  return null;
}
