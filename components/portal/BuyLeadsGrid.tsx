import { ArrowUpRight, LucideIcon, PhoneCall, ShieldCheck, Store } from "lucide-react";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";

type Accent = "teal" | "blue";

type Vendor = {
  name: string;
  description?: string;
  bullets?: string[];
  url: string;
  icon: LucideIcon;
  accent: Accent;
};

// Live, working vendors only — one not ready yet doesn't get a placeholder
// card of its own with nothing behind it; the generic "More Vendors" card
// below covers that instead of listing fake names.
const VENDORS: Vendor[] = [
  {
    name: "Proven Lead Solutions",
    url: "https://provenleadsolutions.com/",
    icon: ShieldCheck,
    accent: "teal",
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
    icon: PhoneCall,
    accent: "blue",
  },
];

const ACCENT_CLASSES: Record<Accent, string> = {
  teal: "bg-teal/15 text-teal-light",
  blue: "bg-blue/15 text-blue-light",
};

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
      {VENDORS.map((vendor) => {
        const Icon = vendor.icon;
        return (
          <Card key={vendor.name} className="flex h-full flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className={cn("flex h-11 w-11 items-center justify-center rounded-lg", ACCENT_CLASSES[vendor.accent])}>
                <Icon className="h-5 w-5" />
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
        );
      })}

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
