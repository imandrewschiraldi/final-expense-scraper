"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import { F90_TOTAL_STEPS, f90DayNumber, f90IsGraduated } from "@/lib/f90Content";

type Agent = {
  id: string;
  name: string;
  email: string;
  f90EnrolledAt: string | null;
  f90CompletedSteps: string[];
};

/** Admin's enroll/un-enroll roster for the First 90 Days (F90) onboarding
 *  program — see lib/f90Content.ts for the curriculum itself and
 *  components/portal/F90Panel.tsx for the agent-facing interactive tab
 *  this enrollment unlocks. */
export function F90AdminPanel({
  initialAgents,
  initialSignatureName,
}: {
  initialAgents: Agent[];
  initialSignatureName: string | null;
}) {
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signatureName, setSignatureName] = useState(initialSignatureName ?? "");
  const [savingSignature, setSavingSignature] = useState(false);
  const [signatureSaved, setSignatureSaved] = useState(false);

  async function saveSignatureName() {
    setSavingSignature(true);
    setSignatureSaved(false);
    try {
      const res = await fetch("/api/admin/f90/signature", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: signatureName }),
      });
      if (res.ok) setSignatureSaved(true);
    } finally {
      setSavingSignature(false);
    }
  }

  async function setEnrolled(agent: Agent, enroll: boolean) {
    setPendingId(agent.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/agents/${agent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ f90Enroll: enroll }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to update enrollment.");
        return;
      }
      setAgents((prev) =>
        prev.map((a) =>
          a.id === agent.id
            ? { ...a, f90EnrolledAt: data.agent.f90EnrolledAt }
            : a,
        ),
      );
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div>
      <p className="mb-6 max-w-2xl text-sm text-muted">
        Enroll a new agent here to give them an interactive F90 tab in their
        own sidebar — the step-by-step licensing-to-production curriculum
        they work through and check off over their first 90 days.
      </p>

      <Card className="mb-6 max-w-md">
        <label className="font-condensed mb-1.5 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
          Certificate Signature Name
        </label>
        <p className="mb-2 text-xs text-muted">
          Printed in cursive on the Graduation Certificate as your signature.
          Left blank, the certificate signs as &quot;Tier 1 Financial&quot;
          instead of a person.
        </p>
        <div className="flex items-center gap-2">
          <Input
            value={signatureName}
            onChange={(e) => {
              setSignatureName(e.target.value);
              setSignatureSaved(false);
            }}
            placeholder="e.g. Jane Smith"
          />
          <Button
            variant="secondary"
            onClick={saveSignatureName}
            disabled={savingSignature}
          >
            {savingSignature ? "Saving…" : signatureSaved ? "Saved" : "Save"}
          </Button>
        </div>
      </Card>

      {error && <p className="mb-4 text-sm text-red-light">{error}</p>}
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="font-condensed border-b border-border text-[11px] font-bold tracking-[0.1em] text-muted uppercase">
              <th className="px-4 py-3">Agent</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Progress</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {agents.map((agent) => {
              const enrolledAt = agent.f90EnrolledAt
                ? new Date(agent.f90EnrolledAt)
                : null;
              const completed = agent.f90CompletedSteps.length;
              const pct = Math.round((completed / F90_TOTAL_STEPS) * 100);
              return (
                <tr
                  key={agent.id}
                  className="border-b border-border/60 hover:bg-surface2"
                >
                  <td className="px-4 py-3">
                    <p className="font-semibold text-foreground">{agent.name}</p>
                    <p className="text-xs text-muted">{agent.email}</p>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {!enrolledAt
                      ? "Not enrolled"
                      : f90IsGraduated(enrolledAt)
                        ? "Day 90+"
                        : `Day ${f90DayNumber(enrolledAt)} of 90`}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {enrolledAt ? (
                      <span>
                        {completed}/{F90_TOTAL_STEPS} steps ({pct}%)
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant={enrolledAt ? "danger" : "primary"}
                      disabled={pendingId === agent.id}
                      onClick={() => setEnrolled(agent, !enrolledAt)}
                      className={cn("text-xs")}
                    >
                      {enrolledAt ? "Un-enroll" : "Enroll in F90"}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
