"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { US_STATES } from "@/lib/usStates";

type Agent = {
  id: string;
  name: string;
  email: string;
  licensedStates: string[];
  active: boolean;
  inviteAccepted: boolean;
  leadCount: number;
};

function StateMultiSelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (states: string[]) => void;
}) {
  function toggle(code: string) {
    onChange(value.includes(code) ? value.filter((c) => c !== code) : [...value, code]);
  }

  return (
    <div className="w-full rounded-lg border border-border bg-surface p-2">
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <span className="text-xs text-muted">
          {value.length === 0 ? "No states selected" : `${value.length} selected`}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            className="text-xs text-teal-light hover:underline"
            onClick={() => onChange(US_STATES.map((s) => s.code))}
          >
            Select all
          </button>
          <button
            type="button"
            className="text-xs text-muted hover:underline"
            onClick={() => onChange([])}
          >
            Clear
          </button>
        </div>
      </div>
      <div className="grid max-h-48 grid-cols-4 gap-1.5 overflow-y-auto p-1 sm:grid-cols-6">
        {US_STATES.map((s) => {
          const active = value.includes(s.code);
          return (
            <button
              type="button"
              key={s.code}
              title={s.name}
              onClick={() => toggle(s.code)}
              className={cn(
                "font-condensed rounded-md border-[1.5px] px-1 py-1.5 text-[12px] font-bold tracking-[0.03em] uppercase transition-colors",
                active
                  ? "border-copper bg-copper text-black"
                  : "border-copper-dim text-muted hover:border-copper hover:text-foreground",
              )}
            >
              {s.code}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AgentsPanel({ initialAgents }: { initialAgents: Agent[] }) {
  const [agents, setAgents] = useState(initialAgents);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStates, setEditStates] = useState<string[]>([]);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<{ id: string; text: string } | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", licensedStates: [] as string[] });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function createAgent() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to create agent");
      return;
    }
    setAgents((prev) => [...prev, { ...data.agent, leadCount: 0 }]);
    setForm({ name: "", email: "", licensedStates: [] });
    setShowForm(false);
    if (data.warning) {
      setResendMessage({ id: data.agent.id, text: data.warning });
    }
  }

  async function resendInvite(agent: Agent) {
    setResendingId(agent.id);
    setResendMessage(null);
    const res = await fetch(`/api/admin/agents/${agent.id}/resend-invite`, { method: "POST" });
    const data = await res.json();
    setResendingId(null);
    setResendMessage({
      id: agent.id,
      text: res.ok ? `Invite resent to ${agent.email}.` : (data.error ?? "Failed to resend invite."),
    });
  }

  async function saveLicensedStates(agentId: string) {
    const res = await fetch(`/api/admin/agents/${agentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licensedStates: editStates }),
    });
    if (res.ok) {
      const data = await res.json();
      setAgents((prev) => prev.map((a) => (a.id === agentId ? { ...a, licensedStates: data.agent.licensedStates } : a)));
      setEditingId(null);
    }
  }

  async function toggleActive(agent: Agent) {
    const res = await fetch(`/api/admin/agents/${agent.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !agent.active }),
    });
    if (res.ok) {
      setAgents((prev) => prev.map((a) => (a.id === agent.id ? { ...a, active: !a.active } : a)));
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>All Agents</CardTitle>
          <Button onClick={() => setShowForm((s) => !s)}>{showForm ? "Cancel" : "Add Agent"}</Button>
        </CardHeader>

        {showForm && (
          <div className="mb-6 space-y-3 rounded-[10px] border border-copper-dim bg-surface2 p-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <Input
                placeholder="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <p className="text-xs text-muted">
              An invite email will be sent to this address so the agent can set their own password.
            </p>
            <div>
              <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
                Licensed States
              </label>
              <StateMultiSelect
                value={form.licensedStates}
                onChange={(states) => setForm({ ...form, licensedStates: states })}
              />
            </div>
            {error && <p className="text-sm text-red-light">{error}</p>}
            <Button onClick={createAgent} disabled={loading}>
              {loading ? "Sending invite..." : "Create Agent & Send Invite"}
            </Button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="font-condensed border-b border-border text-[11px] font-bold tracking-[0.1em] text-muted uppercase">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Licensed States</th>
                <th className="py-2 pr-4">Assigned Leads</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr key={agent.id} className="border-b border-border/60 align-top hover:bg-surface2">
                  <td className="py-2 pr-4 text-white">{agent.name}</td>
                  <td className="py-2 pr-4 text-muted">{agent.email}</td>
                  <td className="py-2 pr-4">
                    {editingId === agent.id ? (
                      <div className="w-80 space-y-2">
                        <StateMultiSelect value={editStates} onChange={setEditStates} />
                        <div className="flex gap-2">
                          <Button variant="secondary" onClick={() => saveLicensedStates(agent.id)}>
                            Save
                          </Button>
                          <Button variant="ghost" onClick={() => setEditingId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className="text-teal-light hover:underline"
                        onClick={() => {
                          setEditingId(agent.id);
                          setEditStates(agent.licensedStates);
                        }}
                      >
                        {agent.licensedStates.length > 0 ? agent.licensedStates.join(", ") : "Set states"}
                      </button>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-white">{agent.leadCount.toLocaleString()}</td>
                  <td className="py-2 pr-4">
                    {!agent.inviteAccepted ? (
                      <span className="text-copper">Invited (pending)</span>
                    ) : (
                      <span className={agent.active ? "text-green-light" : "text-muted"}>
                        {agent.active ? "Active" : "Inactive"}
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex flex-col items-start gap-1">
                      <div className="flex gap-2">
                        {!agent.inviteAccepted && (
                          <Button
                            variant="secondary"
                            onClick={() => resendInvite(agent)}
                            disabled={resendingId === agent.id}
                          >
                            {resendingId === agent.id ? "Sending..." : "Resend Invite"}
                          </Button>
                        )}
                        <Button variant="ghost" onClick={() => toggleActive(agent)}>
                          {agent.active ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                      {resendMessage?.id === agent.id && (
                        <span className="text-xs text-teal-light">{resendMessage.text}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
