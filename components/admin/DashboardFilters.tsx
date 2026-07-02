"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/Input";
import { US_STATES } from "@/lib/usStates";

const PERIODS = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

export function DashboardFilters({ agents }: { agents: { id: string; name: string }[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/admin/dashboard?${params.toString()}`);
  }

  return (
    <div className="mb-6 flex flex-wrap gap-3">
      <div className="w-36">
        <Select
          defaultValue={searchParams.get("period") ?? "week"}
          onChange={(e) => updateParam("period", e.target.value)}
        >
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-48">
        <Select
          defaultValue={searchParams.get("agentId") ?? ""}
          onChange={(e) => updateParam("agentId", e.target.value)}
        >
          <option value="">All Agents</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-40">
        <Select
          defaultValue={searchParams.get("state") ?? ""}
          onChange={(e) => updateParam("state", e.target.value)}
        >
          <option value="">All States</option>
          {US_STATES.map((s) => (
            <option key={s.code} value={s.code}>
              {s.code}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
