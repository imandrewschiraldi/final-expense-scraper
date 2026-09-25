"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Trash2, ChevronUp, ChevronDown } from "lucide-react";

type Contact = { id: string; label: string; phone: string; order: number };
type Link = { id: string; label: string; url: string; isAgentPortal: boolean; order: number };
type Carrier = { id: string; name: string; contacts: Contact[]; links: Link[] };

function AddContactForm({ carrierId, onAdded }: { carrierId: string; onAdded: () => void }) {
  const [label, setLabel] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!label.trim() || !phone.trim()) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/carriers/${carrierId}/contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: label.trim(), phone: phone.trim() }),
    });
    setSaving(false);
    if (res.ok) {
      setLabel("");
      setPhone("");
      onAdded();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Failed to add contact");
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-end gap-2">
      <Input placeholder="Label (e.g. Customer Service Number)" value={label} onChange={(e) => setLabel(e.target.value)} className="w-64" />
      <Input placeholder="Phone (e.g. 800-231-0801)" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-44" />
      <Button variant="secondary" onClick={submit} disabled={saving || !label.trim() || !phone.trim()}>
        {saving ? "Adding..." : "Add Contact"}
      </Button>
      {error && <p className="w-full text-xs text-red-light">{error}</p>}
    </div>
  );
}

function AddLinkForm({ carrierId, onAdded }: { carrierId: string; onAdded: () => void }) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [isAgentPortal, setIsAgentPortal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!label.trim() || !url.trim()) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/carriers/${carrierId}/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: label.trim(), url: url.trim(), isAgentPortal }),
    });
    setSaving(false);
    if (res.ok) {
      setLabel("");
      setUrl("");
      setIsAgentPortal(false);
      onAdded();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Failed to add link");
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-end gap-2">
      <Input placeholder="Button label (e.g. Agent Portal)" value={label} onChange={(e) => setLabel(e.target.value)} className="w-56" />
      <Input placeholder="URL" value={url} onChange={(e) => setUrl(e.target.value)} className="w-64" />
      <label className="flex items-center gap-1.5 pb-2 text-xs text-muted">
        <input type="checkbox" checked={isAgentPortal} onChange={(e) => setIsAgentPortal(e.target.checked)} />
        This is the Agent Portal
      </label>
      <Button variant="secondary" onClick={submit} disabled={saving || !label.trim() || !url.trim()}>
        {saving ? "Adding..." : "Add Link"}
      </Button>
      {error && <p className="w-full text-xs text-red-light">{error}</p>}
    </div>
  );
}

export function CarrierResourcesPanel() {
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCarrierName, setNewCarrierName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/carriers");
    if (res.ok) setCarriers((await res.json()).carriers);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addCarrier() {
    if (!newCarrierName.trim()) return;
    setCreating(true);
    setError(null);
    const res = await fetch("/api/admin/carriers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCarrierName.trim() }),
    });
    setCreating(false);
    if (res.ok) {
      setNewCarrierName("");
      load();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Failed to add carrier");
    }
  }

  async function deleteContact(id: string, label: string) {
    if (!window.confirm(`Delete "${label}"?`)) return;
    const res = await fetch(`/api/admin/carriers/contacts/${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  async function moveContact(id: string, direction: "up" | "down") {
    await fetch(`/api/admin/carriers/contacts/${id}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });
    load();
  }

  async function deleteLink(id: string, label: string) {
    if (!window.confirm(`Delete "${label}"?`)) return;
    const res = await fetch(`/api/admin/carriers/links/${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  async function moveLink(id: string, direction: "up" | "down") {
    await fetch(`/api/admin/carriers/links/${id}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });
    load();
  }

  async function toggleAgentPortal(link: Link) {
    await fetch(`/api/admin/carriers/links/${link.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAgentPortal: !link.isAgentPortal }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Carrier</CardTitle>
        </CardHeader>
        <p className="mb-3 text-sm text-muted">
          Same carrier list as Carrier Rates — adding one here (or there) makes it available in both places. Give it
          phone contacts and link buttons below for the agent-facing Carrier Resources page.
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <Input
            placeholder="Carrier name (e.g. Americo)"
            value={newCarrierName}
            onChange={(e) => setNewCarrierName(e.target.value)}
            className="w-64"
          />
          <Button onClick={addCarrier} disabled={creating || !newCarrierName.trim()}>
            {creating ? "Adding..." : "Add Carrier"}
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-red-light">{error}</p>}
      </Card>

      {loading && <p className="text-sm text-muted">Loading...</p>}

      {!loading && carriers.length === 0 && (
        <p className="text-sm text-muted">No carriers yet — add one above to start building its resources.</p>
      )}

      {carriers.map((carrier) => (
        <Card key={carrier.id}>
          <CardHeader>
            <CardTitle>{carrier.name}</CardTitle>
          </CardHeader>

          <div className="mb-5">
            <h3 className="font-condensed mb-2 text-[11px] font-bold tracking-[0.1em] text-muted uppercase">
              Phone Contacts
            </h3>
            {carrier.contacts.length === 0 ? (
              <p className="text-sm text-muted">No contacts yet.</p>
            ) : (
              <div className="space-y-1">
                {carrier.contacts.map((contact, i) => (
                  <div key={contact.id} className="flex items-center gap-2 rounded-md border border-border/60 px-3 py-1.5 text-sm">
                    <span className="flex-1 text-white">
                      {contact.label} <span className="text-muted">— {contact.phone}</span>
                    </span>
                    <button type="button" onClick={() => moveContact(contact.id, "up")} disabled={i === 0} className="text-muted hover:text-foreground disabled:opacity-30">
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveContact(contact.id, "down")}
                      disabled={i === carrier.contacts.length - 1}
                      className="text-muted hover:text-foreground disabled:opacity-30"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => deleteContact(contact.id, contact.label)} className="text-muted hover:text-red-light">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <AddContactForm carrierId={carrier.id} onAdded={load} />
          </div>

          <div>
            <h3 className="font-condensed mb-2 text-[11px] font-bold tracking-[0.1em] text-muted uppercase">Link Buttons</h3>
            {carrier.links.length === 0 ? (
              <p className="text-sm text-muted">No links yet.</p>
            ) : (
              <div className="space-y-1">
                {carrier.links.map((link, i) => (
                  <div key={link.id} className="flex items-center gap-2 rounded-md border border-border/60 px-3 py-1.5 text-sm">
                    <span className="flex-1 truncate text-white">
                      {link.label} <span className="text-muted">— {link.url}</span>
                    </span>
                    <label className="flex items-center gap-1 text-xs text-muted">
                      <input type="checkbox" checked={link.isAgentPortal} onChange={() => toggleAgentPortal(link)} />
                      Portal
                    </label>
                    <button type="button" onClick={() => moveLink(link.id, "up")} disabled={i === 0} className="text-muted hover:text-foreground disabled:opacity-30">
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveLink(link.id, "down")}
                      disabled={i === carrier.links.length - 1}
                      className="text-muted hover:text-foreground disabled:opacity-30"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => deleteLink(link.id, link.label)} className="text-muted hover:text-red-light">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <AddLinkForm carrierId={carrier.id} onAdded={load} />
          </div>
        </Card>
      ))}
    </div>
  );
}
