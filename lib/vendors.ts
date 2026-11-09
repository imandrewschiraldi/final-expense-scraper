// Moved out of BuyLeadsGrid so the global-search API route can match
// against the same list without importing a "use client" component.
export type Vendor = {
  name: string;
  description?: string;
  bullets?: string[];
  url: string;
  logo: { src: string; width: number; height: number };
  // Proven Leads' logo keeps its white background (the others blend
  // directly onto the dark card) — this puts it on a rounded white chip
  // instead of a hard-edged rectangle.
  logoOnLight?: boolean;
  // Most logos are wide wordmark lockups that read fine at a compact h-8.
  // A near-square/stacked logo (e.g. a mark sitting above its wordmark)
  // needs more height for its own text to stay legible at the same width.
  logoHeightClass?: string;
};

// Live, working vendors only — one not ready yet doesn't get a placeholder
// card of its own with nothing behind it; the generic "More Vendors" card
// in BuyLeadsGrid covers that instead of listing fake names.
export const VENDORS: Vendor[] = [
  {
    name: "Proven Lead Solutions",
    url: "https://provenleadsolutions.com/",
    logo: { src: "/vendor-logos/proven-leads.png", width: 1001, height: 383 },
    logoOnLight: true,
  },
  {
    name: "Closr Leads",
    description:
      "Unlimited lead dialers, plus real-time and aged insurance leads.",
    bullets: [
      "Final Expense, Veteran, Trucker, Mortgage Protection & IUL",
      "Built-in dialer to work leads the moment they come in",
      "Delivered straight to your CRM",
    ],
    url: "https://closrleads.com/go.php?c=TIER1FINANCIAL",
    logo: { src: "/vendor-logos/closr-leads.png", width: 264, height: 85 },
  },
  {
    name: "G.O.A.T Leads",
    url: "https://goatleads.com/",
    logo: { src: "/vendor-logos/goat-leads.png", width: 219, height: 225 },
    logoHeightClass: "h-14",
  },
  {
    name: "Titan Leads",
    url: "https://www.titanleadsolutions.com/",
    logo: { src: "/vendor-logos/titan-leads.png", width: 238, height: 70 },
  },
  {
    name: "ILoveLeads",
    description: "Purchase qualified data leads.",
    bullets: [
      "Real-time leads",
      "Pre-booked appointments",
      "Unlimited inbound lead dialer — blast leads from your own Twilio, Telnyx or SignalHouse numbers (or one they register for you); their AI reads every reply, sorts who's interested, and books the appointment for $0.01/sms",
    ],
    url: "https://iloveleads.com/outbound-suite?ref=ANDREW-91",
    logo: { src: "/vendor-logos/ilove-leads.png", width: 1826, height: 185 },
    logoOnLight: true,
  },
];

/** Stable per-vendor id for anchors/query params — just the name, URL-safe. */
export function vendorSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
