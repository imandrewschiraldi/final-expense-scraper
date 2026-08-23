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
                <Icon className="mb-3 h-6 w-6 text-copper" />
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
