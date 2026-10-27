import Image from "next/image";
import { ArrowUpRight, Store } from "lucide-react";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";

type Vendor = {
  name: string;
  description?: string;
  bullets?: string[];
  url: string;
  logo: { src: string; width: number; height: number };
  // Some vendor logos are only legible on a light background — those get a
  // white chip behind them instead of sitting directly on the dark card.
  logoOnLight?: boolean;
};

// Live, working vendors only — one not ready yet doesn't get a placeholder
// card of its own with nothing behind it; the generic "More Vendors" card
// below covers that instead of listing fake names.
const VENDORS: Vendor[] = [
  {
    name: "Proven Lead Solutions",
    url: "https://provenleadsolutions.com/",
    logo: { src: "/vendor-logos/proven-leads.png", width: 1001, height: 383 },
    logoOnLight: true,
  },
  {
    name: "Closr Leads",
    description: "Unlimited lead dialers, plus real-time and aged insurance leads.",
    bullets: [
      "Final Expense, Veteran, Trucker, Mortgage Protection & IUL",
      "Built-in dialer to work leads the moment they come in",
      "Delivered straight to your CRM",
    ],
    url: "https://closrleads.com/go.php?c=TIER1FINANCIAL",
    logo: { src: "/vendor-logos/closr-leads.png", width: 264, height: 85 },
  },
];

function StatusPill({ live }: { live: boolean }) {
  return (
    <span className="font-condensed flex items-center gap-1.5 text-[11px] font-bold tracking-[0.08em] text-muted uppercase">
      <span className={cn("h-1.5 w-1.5 rounded-full", live ? "bg-green-light" : "bg-muted")} />
      {live ? "Live Now" : "Coming Soon"}
    </span>
  );
}

function VisitSiteButton({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="font-condensed inline-flex w-fit items-center gap-2 rounded-full bg-white py-2 pr-2 pl-4 text-[13px] font-bold text-background transition-opacity hover:opacity-90"
    >
      Visit Site
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-background text-white">
        <ArrowUpRight className="h-3 w-3" />
      </span>
    </a>
  );
}

export function BuyLeadsGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {VENDORS.map((vendor) => (
        <Card key={vendor.name} className="flex h-full flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className={cn("inline-flex items-center rounded-md", vendor.logoOnLight && "bg-white px-2.5 py-1.5")}>
              <Image
                src={vendor.logo.src}
                alt={vendor.name}
                width={vendor.logo.width}
                height={vendor.logo.height}
                className="h-8 w-auto"
              />
            </span>
            <StatusPill live />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{vendor.name}</h2>
            {vendor.description && <p className="mt-1 text-sm text-muted">{vendor.description}</p>}
          </div>
          {vendor.bullets && (
            <ul className="space-y-1.5">
              {vendor.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-2 text-sm text-muted">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-copper-dim" />
                  {bullet}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-auto pt-1">
            <VisitSiteButton url={vendor.url} />
          </div>
        </Card>
      ))}

      <Card className="flex h-full flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-surface2 text-muted">
            <Store className="h-5 w-5" />
          </span>
          <StatusPill live={false} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">More Vendors</h2>
          <p className="mt-1 text-sm text-muted">Additional lead sources are being vetted and will appear here.</p>
        </div>
        <div className="mt-auto pt-1">
          <span className="font-condensed inline-flex w-fit items-center rounded-full border border-border px-4 py-2 text-[13px] font-bold text-muted">
            Check Back Soon
          </span>
        </div>
      </Card>
    </div>
  );
}
