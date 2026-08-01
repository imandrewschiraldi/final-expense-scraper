"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";

type DownlineAgent = {
  id: string;
  name: string;
  email: string;
  metrics: {
    submittedAP: number;
    submittedCount: number;
    issuedAP: number;
    issuedCount: number;
  };
};

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function HierarchyManagerPanel() {
  const [agents, setAgents] = useState<DownlineAgent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portal/hierarchy/downline")
      .then((res) => res.json())
      .then((data) => {
        setAgents(data.agents ?? []);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <p className="text-sm text-muted">Loading...</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Downline — Month to Date</CardTitle>
      </CardHeader>
      {agents.length === 0 ? (
        <p className="text-sm text-muted">No agents report to you yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="font-condensed border-b border-border text-[11px] font-bold tracking-[0.1em] text-muted uppercase">
                <th className="py-2 pr-4">Agent</th>
                <th className="py-2 pr-4">Submitted</th>
                <th className="py-2 pr-4">Issued</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr key={agent.id} className="border-b border-border/60">
                  <td className="py-2 pr-4">
                    <p className="text-white">{agent.name}</p>
                    <p className="text-xs text-muted">{agent.email}</p>
                  </td>
                  <td className="py-2 pr-4 text-white">
                    {formatCurrency(agent.metrics.submittedAP)}{" "}
                    <span className="text-muted">({agent.metrics.submittedCount})</span>
                  </td>
                  <td className="py-2 pr-4 text-white">
                    {formatCurrency(agent.metrics.issuedAP)}{" "}
                    <span className="text-muted">({agent.metrics.issuedCount})</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
