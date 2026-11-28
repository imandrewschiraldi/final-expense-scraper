"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { LEAD_TYPES, LEAD_TYPE_LABELS, type LeadType } from "@/lib/leadType";

const SOURCE_OPTIONS = ["Self Gen", "Referral", "Purchased Mailer", "Live Transfer", "Other"];

export function AddContactModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    leadType: "" as LeadType | "",
    source: "",
    city: "",
    state: "",
    zip: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(addAnother: boolean) {
    setError(null);
    if (!form.phone.trim()) return setError("Phone is required.");
    if (!form.leadType) return setError("Lead type is required.");
    setSaving(true);
    try {
      const res = await fetch("/api/agent/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to save contact.");
        return;
      }
      onCreated();
      if (addAnother) {
        setForm({ ...form, firstName: "", lastName: "", phone: "", email: "" });
      } else {
        onClose();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Add Contact" maxWidthClassName="max-w-lg">
      <div className="space-y-4">
        <p className="text-sm text-muted">Goes straight into your book, ready to work.</p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.1em] text-muted uppercase">
              First name
            </label>
            <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          </div>
          <div>
            <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.1em] text-muted uppercase">
              Last name
            </label>
            <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </div>
        </div>

        <div>
          <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.1em] text-muted uppercase">
            Phone <span className="text-red-light">*</span>
          </label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>

        <div>
          <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.1em] text-muted uppercase">
            Email
          </label>
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>

        <div>
          <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.1em] text-muted uppercase">
            Lead type <span className="text-red-light">*</span>
          </label>
          <Select
            value={form.leadType}
            onChange={(e) => setForm({ ...form, leadType: e.target.value as LeadType })}
          >
            <option value="">Select lead type…</option>
            {LEAD_TYPES.map((t) => (
              <option key={t} value={t}>
                {LEAD_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.1em] text-muted uppercase">
            Source
          </label>
          <Select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
            <option value="">Select source…</option>
            {SOURCE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.1em] text-muted uppercase">
              City
            </label>
            <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div>
            <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.1em] text-muted uppercase">
              State
            </label>
            <Input
              value={form.state}
              maxLength={2}
              onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
              placeholder="Your state"
            />
          </div>
          <div>
            <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.1em] text-muted uppercase">
              Zip
            </label>
            <Input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
          </div>
        </div>

        {error && <p className="text-sm text-red-light">{error}</p>}

        <div className="flex items-center justify-between gap-2 pt-2">
          <button
            type="button"
            onClick={() => save(true)}
            disabled={saving}
            className="font-condensed text-[11px] font-bold tracking-[0.1em] text-teal-light uppercase hover:underline disabled:opacity-50"
          >
            Save and add another
          </button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => save(false)} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
