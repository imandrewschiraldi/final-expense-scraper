// The header's "quick links" grid (TopBarActions -> QuickLinksMenu) — one
// tile per outside platform agents jump to constantly (training camp,
// Family First Life's own portal, the state-licensing/appointment tools).
// `url` is null until the agency hands over the real link for that tile —
// a null-url tile renders disabled instead of shipping a dead "#" link.
// `logo` is a /public/quick-links/<id>.png path, added the same way.
export type QuickLink = {
  id: string;
  name: string;
  url: string | null;
  logo: string | null;
};

export const QUICK_LINKS: QuickLink[] = [
  { id: "ffl-training-camp", name: "FFL Training Camp", url: null, logo: null },
  { id: "ffl-gateway", name: "FFL Gateway", url: null, logo: null },
  { id: "nlc", name: "NLC", url: null, logo: null },
  { id: "surelc", name: "SureLC", url: null, logo: null },
];
