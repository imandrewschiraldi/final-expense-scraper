import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Callout } from "@/components/ui/Callout";
import { format } from "date-fns";

type Flag = {
  id: string;
  reason: string;
  leadsAssigned: number;
  agent: { id: string; name: string };
};

type Run = {
  id: string;
  weekOf: string | Date;
  flags: Flag[];
};

const REASON_LABELS: Record<string, string> = {
  no_available_leads_in_licensed_states: "No leads available in licensed states",
  partial_leads_available: "Only partial leads available",
  no_licensed_states: "Agent has no licensed states configured",
  new_lead_eligibility_expired: "Past their 6-week new-lead window",
};

export function AssignmentFlags({ runs }: { runs: Run[] }) {
  const latestRunWithFlags = runs.find((r) => r.flags.length > 0);

  if (!latestRunWithFlags) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weekly Assignment Flags</CardTitle>
        </CardHeader>
        <p className="text-sm text-muted">No flags — every agent got their full 300 leads last run.</p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Weekly Assignment Flags — {format(new Date(latestRunWithFlags.weekOf), "MMM d, yyyy")}
        </CardTitle>
      </CardHeader>
      <div className="space-y-2">
        {latestRunWithFlags.flags.map((flag) => (
          <Callout key={flag.id} variant="gold" className="flex items-center justify-between py-3">
            <span className="text-white">{flag.agent.name}</span>
            <span className="font-condensed text-xs font-bold tracking-wide uppercase">
              {REASON_LABELS[flag.reason] ?? flag.reason} ({flag.leadsAssigned} assigned)
            </span>
          </Callout>
        ))}
      </div>
    </Card>
  );
}
