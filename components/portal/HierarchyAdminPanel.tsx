"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";

type HierarchyUser = {
  id: string;
  name: string;
  email: string;
  role: "MANAGER" | "AGENT";
  managerId: string | null;
  active: boolean;
};

export function HierarchyAdminPanel() {
  const [users, setUsers] = useState<HierarchyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/hierarchy")
      .then((res) => res.json())
      .then((data) => {
        setUsers(data.users ?? []);
        setLoading(false);
      });
  }, []);

  async function patchUser(id: string, body: Record<string, unknown>) {
    setBusyId(id);
    setError(null);
    const res = await fetch(`/api/admin/hierarchy/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setError(data.error ?? "Failed to update.");
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === id ? data.user : u)));
  }

  if (loading) {
    return <p className="text-sm text-muted">Loading...</p>;
  }

  const managers = users.filter((u) => u.role === "MANAGER");
  const agents = users.filter((u) => u.role === "AGENT");

  function AgentRow({ agent }: { agent: HierarchyUser }) {
    return (
      <div className="flex items-center justify-between gap-4 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm text-white">{agent.name}</p>
          <p className="truncate text-xs text-muted">{agent.email}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Select
            className="w-44 py-1 text-xs"
            value={agent.managerId ?? ""}
            disabled={busyId === agent.id}
            onChange={(e) => patchUser(agent.id, { managerId: e.target.value || null })}
          >
            <option value="">— Unassigned —</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
          <Button
            variant="ghost"
            disabled={busyId === agent.id}
            onClick={() => patchUser(agent.id, { role: "MANAGER" })}
          >
            Promote
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-red-light">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Managers</CardTitle>
        </CardHeader>
        {managers.length === 0 && <p className="text-sm text-muted">No managers yet — promote an agent below.</p>}
        <div className="space-y-4">
          {managers.map((manager) => {
            const downline = agents.filter((a) => a.managerId === manager.id);
            return (
              <div key={manager.id} className="rounded-[10px] border border-border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{manager.name}</p>
                    <p className="text-xs text-muted">
                      {manager.email} · {downline.length} agent{downline.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    disabled={busyId === manager.id}
                    onClick={() => patchUser(manager.id, { role: "AGENT" })}
                  >
                    Demote to Agent
                  </Button>
                </div>
                {downline.length > 0 && (
                  <div className="mt-2 divide-y divide-border border-t border-border pl-4">
                    {downline.map((agent) => (
                      <AgentRow key={agent.id} agent={agent} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Unassigned Agents</CardTitle>
        </CardHeader>
        {agents.filter((a) => !a.managerId).length === 0 ? (
          <p className="text-sm text-muted">Every agent reports to a manager.</p>
        ) : (
          <div className="divide-y divide-border">
            {agents
              .filter((a) => !a.managerId)
              .map((agent) => (
                <AgentRow key={agent.id} agent={agent} />
              ))}
          </div>
        )}
      </Card>
    </div>
  );
}
