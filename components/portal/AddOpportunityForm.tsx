"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LEAD_TYPE_LABELS, type LeadType } from "@/lib/leadType";

type Contact = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  state: string;
  leadType: LeadType;
};

/** Book of Business's "+ Add Opportunity" on a Lead-phase pipeline —
 *  searches the agent's own existing contacts rather than creating a new
 *  one (a contact only ever comes into being through an import or the
 *  Vault), then moves the picked contact into this pipeline. A Lead only
 *  belongs to one product pipeline at a time today, so picking a contact
 *  already in a different one reassigns them here rather than adding a
 *  second simultaneous membership. */
export function AddOpportunityForm({
  defaultLeadType,
  onAdded,
}: {
  defaultLeadType: LeadType;
  onAdded: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Contact[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Contact | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (selected || q.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      return;
    }
    setSearching(true);
    const handle = setTimeout(() => {
      fetch(`/api/agent/leads?q=${encodeURIComponent(q)}`)
        .then((res) => (res.ok ? res.json() : { leads: [] }))
        .then((data) => setResults(data.leads ?? []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [query, selected]);

  async function addToPipeline() {
    if (!selected) return;
    setError(null);
    setSaving(true);
    const res = await fetch(`/api/agent/leads/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadType: defaultLeadType }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to add opportunity.");
      return;
    }
    onAdded();
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Search for an existing contact to add as an opportunity in this
        pipeline.
      </p>
      <div>
        <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
          Contact
        </label>
        <Input
          placeholder="Search by name..."
          value={
            selected ? `${selected.firstName} ${selected.lastName}` : query
          }
          onChange={(e) => {
            setSelected(null);
            setQuery(e.target.value);
          }}
        />
        {!selected && query.trim().length >= 2 && (
          <div className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-surface">
            {searching ? (
              <p className="px-3 py-2 text-xs text-muted">Searching...</p>
            ) : results.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted">No contacts found.</p>
            ) : (
              results.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setSelected(c);
                    setResults([]);
                  }}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-surface2"
                >
                  <span className="font-semibold text-white">
                    {c.firstName} {c.lastName}
                  </span>
                  <span className="ml-2 text-xs text-muted">
                    {c.phone} &middot; {c.state}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
      {selected && selected.leadType !== defaultLeadType && (
        <p className="text-xs text-muted">
          {selected.firstName} {selected.lastName} is currently in{" "}
          {LEAD_TYPE_LABELS[selected.leadType]} Leads. Adding them here moves
          them to this pipeline.
        </p>
      )}
      {error && <p className="text-sm text-red-light">{error}</p>}
      <Button
        onClick={addToPipeline}
        disabled={!selected || saving}
        className="w-full"
      >
        {saving ? "Adding..." : "Add Opportunity"}
      </Button>
    </div>
  );
}
