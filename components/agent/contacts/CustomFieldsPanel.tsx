// The Contacts page's "Custom Fields" tab. Every field here is a real,
// fixed column on the Lead/Policy model (see prisma/schema.prisma) — this
// isn't a dynamic field builder like the reference CRM's, since fields
// aren't agent-configurable in this app. It's a reference catalog: what
// data this CRM captures on a contact, grouped the way the agency's own
// "Essential Custom Fields" spec groups it, and where each one lives today.
type FieldStatus = "live" | "pending";

type FieldDef = {
  label: string;
  description: string;
  where: string;
  status: FieldStatus;
};

type Category = {
  name: string;
  fields: FieldDef[];
};

const CATEGORIES: Category[] = [
  {
    name: "Lead & Demographic Info",
    fields: [
      { label: "Lead Source / Vendor", description: "Facebook Ad, Direct Mail, Aged Lead, Referral, etc.", where: "Add Contact form", status: "live" },
      { label: "Lead Type", description: "Final Expense, Mortgage Protection, IUL, Term Life, Annuity, etc.", where: "Add Contact form", status: "live" },
      { label: "Age / Date of Birth", description: "Age is computed from DOB wherever one exists.", where: "Add Contact form", status: "live" },
      { label: "Tobacco / Nicotine Use", description: "Yes, No, or Quit 12+ months ago.", where: "Client Suitability Sheet", status: "live" },
      { label: "State", description: "Routes leads to agents licensed in that state.", where: "Add Contact form", status: "live" },
    ],
  },
  {
    name: "Underwriting & Health Pre-Qualification",
    fields: [
      { label: "Height & Weight", description: "For quick carrier build-chart checks.", where: "Client Suitability Sheet", status: "live" },
      { label: "Major Health Conditions", description: "Multi-select, matches the paper Suitability Sheet's list.", where: "Client Suitability Sheet", status: "live" },
      { label: "Current Medications", description: "Free text.", where: "Client Suitability Sheet", status: "live" },
      { label: "Coverage Goal / Desired Face Amount", description: "Bucketed ($10k–$25k / $50k–$100k / $250k+) plus a free-text amount.", where: "Client Suitability Sheet", status: "live" },
      { label: "Monthly Budget", description: "What the client can afford monthly toward coverage.", where: "Client Suitability Sheet", status: "live" },
    ],
  },
  {
    name: "Policy & Carrier Details (Post-Sale)",
    fields: [
      { label: "Carrier", description: "Mutual of Omaha, Americo, Corebridge, Foresters, Transamerica, etc.", where: "Book of Business", status: "live" },
      { label: "Product / Plan Name", description: "e.g. Living Promise Level, Term Made Simple.", where: "Book of Business", status: "live" },
      { label: "Policy Number", description: "On the Policy record.", where: "Submit Policy form", status: "pending" },
      { label: "Monthly / Annualized Premium", description: "Used for commission tracking and pipeline value.", where: "Submit Policy form", status: "pending" },
      { label: "Policy Effective / Draft Date", description: "Triggers the first-draft check-in.", where: "Submit Policy form", status: "pending" },
      { label: "Beneficiary Name & Relationship", description: "", where: "Submit Policy form", status: "pending" },
    ],
  },
];

export function CustomFieldsPanel() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        Every field this CRM captures on a contact, grouped the way your Essential Custom Fields list
        groups them. These are fixed columns, not agent-creatable fields — ask to have one added or
        changed.
      </p>
      {CATEGORIES.map((category) => (
        <div key={category.name} className="rounded-[10px] border border-border bg-surface p-4">
          <p className="font-condensed mb-3 text-[13px] font-extrabold tracking-[0.1em] text-copper uppercase">
            {category.name}
          </p>
          <div className="divide-y divide-border/60">
            {category.fields.map((field) => (
              <div key={field.label} className="flex items-center justify-between gap-4 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground">{field.label}</p>
                  {field.description && <p className="text-xs text-muted">{field.description}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-muted">{field.where}</span>
                  <span
                    className={
                      field.status === "live"
                        ? "font-condensed rounded-full bg-teal-light/20 px-2 py-0.5 text-[10px] font-bold text-teal-light uppercase"
                        : "font-condensed rounded-full bg-amber/20 px-2 py-0.5 text-[10px] font-bold text-amber uppercase"
                    }
                  >
                    {field.status === "live" ? "Live" : "Coming Soon"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
