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
  { id: "ffl-training-camp", name: "FFL Training Camp", url: "https://trainingcamp.ffl.uppatop.com/login", logo: "/quick-links/ffl-training-camp.png" },
  { id: "ffl-gateway", name: "Gateway", url: "https://ww3.familyfirstlife.com", logo: "/quick-links/ffl-gateway.png" },
  { id: "nlc", name: "NLC", url: "https://nlc.chims.uppatop.com/login", logo: "/quick-links/nlc.jpg" },
  {
    id: "surelc",
    name: "SureLC",
    url: "https://accounts.surancebay.com/oauth/authorize?redirect_uri=https:%2F%2Fsurelc.surancebay.com%2Fproducer%2Foauth%3FreturnUrl%3D%252Fprofile%252Fcontact-info%253FgaId%253D689&gaId=689&client_id=surecrmweb&response_type=code",
    logo: "/quick-links/surelc.jpg",
  },
  { id: "hcms", name: "HCMS", url: "https://hcms.chims.uppatop.com/login", logo: "/quick-links/hcms.jpg" },
];
