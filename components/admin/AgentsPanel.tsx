"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { US_STATES } from "@/lib/usStates";

type Agent = {
  id: string;
  name: string;
  email: string;
  licensedStates: string[];
  active: boolean;
  leadCount: number;
};

function StateMultiSelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (states: string[]) => void;
}) {
  return (
    <select
      multiple
      value={value}
      onChange={(e) => onChange(Array.from(e.target.selectedOptions, (o) => o.value))}
      className="h-32 w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-foreground focus:border-copper focus:outline-none"
    >
      {US_STATES.map((s) => (
        <option key={s.code} value={s.code}>
          {s.code} — {s.name}
        </option>
      ))}
    </select>
  );
}

export function AgentsPanel({ initialAgents }: { initialAgents: Agent[] }) {
  const [agents, setAgents] = useState(initialAgents);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStates, setEditStates] = useState<string[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", licensedStates: [] as string[] });
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
    setForm({ name: "", email: "", password: "", licensedStates: [] });
    setShowForm(false);
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
          <div className="mb-6 space-y-3 rounded-md border border-border bg-surface-raised p-4">
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
            <Input
              placeholder="Temporary password"
              type="text"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-muted">Licensed States</label>
              <StateMultiSelect
                value={form.licensedStates}
                onChange={(states) => setForm({ ...form, licensedStates: states })}
              />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button onClick={createAgent} disabled={loading}>
              {loading ? "Creating..." : "Create Agent"}
            </Button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
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
                <tr key={agent.id} className="border-b border-border/60 align-top">
                  <td className="py-2 pr-4 text-foreground">{agent.name}</td>
                  <td className="py-2 pr-4 text-muted">{agent.email}</td>
                  <td className="py-2 pr-4">
                    {editingId === agent.id ? (
                      <div className="w-48 space-y-2">
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
                  <td className="py-2 pr-4 text-foreground">{agent.leadCount.toLocaleString()}</td>
                  <td className="py-2 pr-4">
                    <span className={agent.active ? "text-green-light" : "text-muted"}>
                      {agent.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-2 pr-4">
                    <Button variant="ghost" onClick={() => toggleActive(agent)}>
                      {agent.active ? "Deactivate" : "Activate"}
                    </Button>
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
