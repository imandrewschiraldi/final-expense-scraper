import Link from "next/link";
import { ClipboardList, Upload, Send } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PageHeading } from "@/components/portal/PageHeading";

const SECTIONS = [
  {
    href: "/admin/leads/all",
    label: "All Leads",
    description: "Browse, search, and manage every lead in the system.",
    icon: ClipboardList,
  },
  {
    href: "/admin/leads/import",
    label: "Import Leads",
    description: "Upload a CSV of new leads, with dedupe and error reporting.",
    icon: Upload,
  },
  {
    href: "/admin/leads/assign",
    label: "Assign Leads",
    description: "Batch-assign or quick-assign unassigned leads to agents.",
    icon: Send,
  },
];

export default function LeadsPage() {
  return (
    <div>
      <PageHeading slug="leads" alt="Leads" />
      <div className="grid gap-4 sm:grid-cols-3">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <Link key={section.href} href={section.href} className="block">
              <Card className="h-full transition-colors hover:border-copper">
                <div className="metal-copper-surface mb-3 flex h-10 w-10 items-center justify-center rounded-lg">
                  <Icon className="h-5 w-5 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.55)]" />
                </div>
                <h2 className="font-condensed mb-1 text-base font-extrabold tracking-wide text-white uppercase">
                  {section.label}
                </h2>
                <p className="text-sm text-muted">{section.description}</p>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
