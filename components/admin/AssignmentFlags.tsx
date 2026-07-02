import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
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
    <Card className="border-gold/40">
      <CardHeader>
        <CardTitle>
          Weekly Assignment Flags — {format(new Date(latestRunWithFlags.weekOf), "MMM d, yyyy")}
        </CardTitle>
      </CardHeader>
      <ul className="space-y-2">
        {latestRunWithFlags.flags.map((flag) => (
          <li
            key={flag.id}
            className="flex items-center justify-between rounded-md border border-gold/30 bg-gold/5 px-3 py-2 text-sm"
          >
            <span className="text-foreground">{flag.agent.name}</span>
            <span className="text-gold">
              {REASON_LABELS[flag.reason] ?? flag.reason} ({flag.leadsAssigned} assigned)
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
