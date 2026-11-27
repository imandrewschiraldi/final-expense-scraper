"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { LeadType } from "@/lib/leadType";

const emptyForm = {
  firstName: "",
  lastName: "",
  phone: "",
  state: "",
  dateOfBirth: "",
};

/** Adds a single lead directly — distinct from AgentLeadImportForm's CSV
 *  bulk import, this is Book of Business's "+ Add Opportunity" on a
 *  Lead-phase pipeline, pre-tagged with whichever pipeline it was opened
 *  from. */
export function AddLeadForm({
  defaultLeadType,
  onAdded,
}: {
  defaultLeadType: LeadType;
  onAdded: () => void;
}) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setError(null);
    if (!form.firstName.trim() || !form.phone.trim() || !form.state.trim()) {
      setError("First name, phone, and state are required.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/agent/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, leadType: defaultLeadType }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to add lead.");
      return;
    }
    onAdded();
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Input
          placeholder="First Name"
          value={form.firstName}
          onChange={(e) => setForm({ ...form, firstName: e.target.value })}
        />
        <Input
          placeholder="Last Name"
          value={form.lastName}
          onChange={(e) => setForm({ ...form, lastName: e.target.value })}
        />
        <Input
          placeholder="Phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <Input
          placeholder="State"
          value={form.state}
          onChange={(e) => setForm({ ...form, state: e.target.value })}
        />
        <Input
          type="date"
          placeholder="Date of Birth"
          value={form.dateOfBirth}
          onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
        />
      </div>
      {error && <p className="text-sm text-red-light">{error}</p>}
      <Button onClick={save} disabled={saving} className="w-full">
        {saving ? "Adding..." : "Add Opportunity"}
      </Button>
    </div>
  );
}
