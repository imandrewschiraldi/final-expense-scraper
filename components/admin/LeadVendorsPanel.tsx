"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Trash2, ChevronUp, ChevronDown } from "lucide-react";

type Vendor = { id: string; name: string; description: string | null; url: string; order: number };

function AddVendorForm({ onAdded }: { onAdded: () => void }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim() || !url.trim()) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/lead-vendors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), url: url.trim(), description: description.trim() || undefined }),
    });
    setSaving(false);
    if (res.ok) {
      setName("");
      setUrl("");
      setDescription("");
      onAdded();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Failed to add vendor");
    }
  }

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Input placeholder="Vendor name (e.g. ABC Leads)" value={name} onChange={(e) => setName(e.target.value)} className="w-56" />
      <Input placeholder="Referral URL" value={url} onChange={(e) => setUrl(e.target.value)} className="w-64" />
      <Input
        placeholder="Short description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-64"
      />
      <Button type="submit" disabled={saving || !name.trim() || !url.trim()}>
        {saving ? "Adding..." : "Add Vendor"}
      </Button>
      {error && <p className="w-full text-xs text-red-light">{error}</p>}
    </form>
  );
}

function EditVendorForm({ vendor, onDone }: { vendor: Vendor; onDone: () => void }) {
  const [name, setName] = useState(vendor.name);
  const [url, setUrl] = useState(vendor.url);
  const [description, setDescription] = useState(vendor.description ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim() || !url.trim()) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/lead-vendors/${vendor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), url: url.trim(), description: description.trim() }),
    });
    setSaving(false);
    if (res.ok) {
      onDone();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Failed to save vendor");
    }
  }

  return (
    <form
      className="flex flex-wrap items-end gap-2 rounded-md border border-border/60 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Input value={name} onChange={(e) => setName(e.target.value)} className="w-56" />
      <Input value={url} onChange={(e) => setUrl(e.target.value)} className="w-64" />
      <Input value={description} onChange={(e) => setDescription(e.target.value)} className="w-64" />
      <Button type="submit" variant="secondary" disabled={saving || !name.trim() || !url.trim()}>
        {saving ? "Saving..." : "Save"}
      </Button>
      <Button type="button" variant="ghost" onClick={onDone} disabled={saving}>
        Cancel
      </Button>
      {error && <p className="w-full text-xs text-red-light">{error}</p>}
    </form>
  );
}

export function LeadVendorsPanel() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/lead-vendors");
    if (res.ok) setVendors((await res.json()).vendors);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function deleteVendor(id: string, name: string) {
    if (!window.confirm(`Delete "${name}"?`)) return;
    const res = await fetch(`/api/admin/lead-vendors/${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  async function moveVendor(id: string, direction: "up" | "down") {
    await fetch(`/api/admin/lead-vendors/${id}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Lead Vendor</CardTitle>
        </CardHeader>
        <p className="mb-3 text-sm text-muted">
          Shown to every agent and manager on the Buy Leads page, in this order — use the arrows below to reorder.
          Use your own referral/affiliate link as the URL.
        </p>
        <AddVendorForm onAdded={load} />
      </Card>

      {loading && <p className="text-sm text-muted">Loading...</p>}

      {!loading && vendors.length === 0 && (
        <p className="text-sm text-muted">No lead vendors yet — add one above.</p>
      )}

      {vendors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Lead Vendors</CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {vendors.map((vendor, i) =>
              editingId === vendor.id ? (
                <EditVendorForm key={vendor.id} vendor={vendor} onDone={() => { setEditingId(null); load(); }} />
              ) : (
                <div key={vendor.id} className="flex items-center gap-2 rounded-md border border-border/60 px-3 py-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-white">{vendor.name}</span>{" "}
                    <span className="text-muted">— {vendor.url}</span>
                    {vendor.description && <p className="text-xs text-muted">{vendor.description}</p>}
                  </div>
                  <button type="button" onClick={() => setEditingId(vendor.id)} className="text-xs font-semibold text-copper hover:underline">
                    Edit
                  </button>
                  <button type="button" onClick={() => moveVendor(vendor.id, "up")} disabled={i === 0} className="text-muted hover:text-foreground disabled:opacity-30">
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveVendor(vendor.id, "down")}
                    disabled={i === vendors.length - 1}
                    className="text-muted hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => deleteVendor(vendor.id, vendor.name)} className="text-muted hover:text-red-light">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ),
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
