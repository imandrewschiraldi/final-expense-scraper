import { Card } from "@/components/ui/Card";

type Vendor = { name: string; description?: string; url?: string };

// A plain static resource list, not a database-backed admin panel — add,
// edit, or reorder a vendor here directly. `url` is each vendor's own
// referral/affiliate link; the commission it earns isn't shown to agents,
// so this reads to them as a trusted-source directory, not a marketplace.
// `url`/`description` are optional so a vendor can be listed before its
// link is ready — it renders with a "Coming Soon" badge instead of a dead
// link until one is added.
const VENDORS: Vendor[] = [
  { name: "Proven Lead Solutions", url: "https://provenleadsolutions.com/" },
  {
    name: "Closr Leads",
    description:
      "Unlimited lead dialers & Real-time and aged insurance leads — Final Expense, Veteran, Trucker, Mortgage Protection & IUL — plus a built-in dialer to work them. Delivered to your CRM the moment they come in.",
    url: "https://closrleads.com/go.php?c=TIER1FINANCIAL",
  },
  { name: "Goat Leads" },
  { name: "Aria Leads" },
  { name: "Titan Lead Solutions" },
  { name: "Life Jacket Leads" },
  { name: "DialerX Unlimited Leads" },
];

export function BuyLeadsGrid() {
  if (VENDORS.length === 0) {
    return <p className="text-sm text-muted">No lead vendors have been added yet.</p>;
  }

  return (
    <div className="space-y-3">
      {VENDORS.map((vendor) => (
        <Card key={vendor.name} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-white">{vendor.name}</h2>
            {vendor.description && <p className="mt-1 max-w-xl text-sm text-muted">{vendor.description}</p>}
          </div>

          {vendor.url ? (
            <a
              href={vendor.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-condensed inline-flex shrink-0 items-center justify-center gap-2 rounded-md border-[1.5px] border-copper-dim px-4 py-2 text-[13px] font-bold tracking-[0.05em] text-muted uppercase transition-colors hover:border-copper hover:text-foreground"
            >
              Visit Site
            </a>
          ) : (
            <span className="font-condensed shrink-0 text-xs font-bold tracking-[0.1em] text-muted uppercase">
              Coming Soon
            </span>
          )}
        </Card>
      ))}
    </div>
  );
}
