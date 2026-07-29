"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";

type Vendor = {
  id: string;
  name: string;
  website: string | null;
  contactInfo: string | null;
  notes: string | null;
};

const EMPTY_FORM = { name: "", website: "", contactInfo: "", notes: "" };

export function LeadVendorsPanel({
  initialVendors,
  isAdmin,
}: {
  initialVendors: Vendor[];
  isAdmin: boolean;
}) {
  const [vendors, setVendors] = useState(initialVendors);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit(vendor: Vendor) {
    setEditingId(vendor.id);
    setForm({
      name: vendor.name,
      website: vendor.website ?? "",
      contactInfo: vendor.contactInfo ?? "",
      notes: vendor.notes ?? "",
    });
    setShowForm(true);
  }

  function startCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  async function save() {
    if (!form.name.trim()) {
      setError("Vendor name is required");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch(editingId ? `/api/portal/lead-vendors/${editingId}` : "/api/portal/lead-vendors", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to save vendor");
      return;
    }
    if (editingId) {
      setVendors((prev) => prev.map((v) => (v.id === editingId ? data.vendor : v)).sort((a, b) => a.name.localeCompare(b.name)));
    } else {
      setVendors((prev) => [...prev, data.vendor].sort((a, b) => a.name.localeCompare(b.name)));
    }
    setShowForm(false);
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  async function remove(id: string) {
    if (!window.confirm("Remove this vendor from the list?")) return;
    const res = await fetch(`/api/portal/lead-vendors/${id}`, { method: "DELETE" });
    if (res.ok) {
      setVendors((prev) => prev.filter((v) => v.id !== id));
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Lead Vendors</CardTitle>
          {isAdmin && <Button onClick={startCreate}>{showForm ? "Cancel" : "Add Vendor"}</Button>}
        </CardHeader>
        <p className="mb-4 text-sm text-muted">Vendors the team can buy leads from, outside the shared pool.</p>

        {isAdmin && showForm && (
          <div className="mb-6 space-y-3 rounded-[10px] border border-copper-dim bg-surface2 p-4">
            <Input placeholder="Vendor name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
            <Input
              placeholder="Contact info (email, phone, rep name...)"
              value={form.contactInfo}
              onChange={(e) => setForm({ ...form, contactInfo: e.target.value })}
            />
            <textarea
              placeholder="Notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="min-h-20 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-copper-dim focus:outline-none"
            />
            {error && <p className="text-sm text-red-light">{error}</p>}
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving..." : editingId ? "Save Changes" : "Add Vendor"}
            </Button>
          </div>
        )}

        <div className="space-y-3">
          {vendors.length === 0 && <p className="text-sm text-muted">No lead vendors added yet.</p>}
          {vendors.map((vendor) => (
            <div key={vendor.id} className="rounded-[10px] border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-condensed text-lg font-extrabold text-white uppercase">{vendor.name}</p>
                  {vendor.website && (
                    <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="text-sm text-teal-light hover:underline">
                      {vendor.website}
                    </a>
                  )}
                  {vendor.contactInfo && <p className="mt-1 text-sm text-muted">{vendor.contactInfo}</p>}
                  {vendor.notes && <p className="mt-1 text-sm text-muted">{vendor.notes}</p>}
                </div>
                {isAdmin && (
                  <div className="flex shrink-0 gap-2">
                    <Button variant="ghost" onClick={() => startEdit(vendor)}>
                      Edit
                    </Button>
                    <Button variant="danger" onClick={() => remove(vendor.id)}>
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
