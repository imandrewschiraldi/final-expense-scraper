"use client";

import { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { LEAD_TYPES, LEAD_TYPE_LABELS, type LeadType } from "@/lib/leadType";
import { useTagColors } from "./useTagColors";

const SOURCE_OPTIONS = ["Self Gen", "Referral", "Purchased Mailer", "Live Transfer", "Other"];
const PHONE_TYPES = ["MOBILE", "HOME", "WORK", "OTHER"] as const;

type DuplicateMatch = { id: string; firstName: string; lastName: string; email: string | null; phone: string } | null;

export function AddContactModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const { colorFor, ensureColor } = useTagColors();
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
    dndAll: false,
  });
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [secondaryEmails, setSecondaryEmails] = useState<string[]>([]);
  const [secondaryPhones, setSecondaryPhones] = useState<{ value: string; type: string }[]>([]);
  const [duplicate, setDuplicate] = useState<DuplicateMatch>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkDuplicate() {
    if (!form.email.trim() && form.phone.replace(/\D/g, "").length < 10) {
      setDuplicate(null);
      return;
    }
    const params = new URLSearchParams();
    if (form.email.trim()) params.set("email", form.email.trim());
    if (form.phone.trim()) params.set("phone", form.phone.trim());
    const res = await fetch(`/api/agent/leads/check-duplicate?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setDuplicate(data.match);
    }
  }

  function addTag() {
    const tag = tagInput.trim();
    if (!tag || tags.includes(tag)) return;
    setTags((prev) => [...prev, tag]);
    setTagInput("");
    ensureColor(tag);
  }

  async function save(addAnother: boolean) {
    setError(null);
    if (!form.phone.trim()) return setError("Phone is required.");
    if (!form.leadType) return setError("Lead type is required.");
    setSaving(true);
    try {
      const res = await fetch("/api/agent/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, tags, secondaryEmails, secondaryPhones }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to save contact.");
        return;
      }
      onCreated();
      if (addAnother) {
        setForm({ ...form, firstName: "", lastName: "", phone: "", email: "", dndAll: false });
        setTags([]);
        setSecondaryEmails([]);
        setSecondaryPhones([]);
        setDuplicate(null);
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
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} onBlur={checkDuplicate} />
          {secondaryPhones.map((p, i) => (
            <div key={i} className="mt-2 flex items-center gap-2">
              <Input
                value={p.value}
                onChange={(e) =>
                  setSecondaryPhones((prev) => prev.map((row, idx) => (idx === i ? { ...row, value: e.target.value } : row)))
                }
                className="flex-1"
                placeholder="Additional phone"
              />
              <Select
                value={p.type}
                onChange={(e) =>
                  setSecondaryPhones((prev) => prev.map((row, idx) => (idx === i ? { ...row, type: e.target.value } : row)))
                }
                className="!w-28"
              >
                {PHONE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0) + t.slice(1).toLowerCase()}
                  </option>
                ))}
              </Select>
              <button
                type="button"
                onClick={() => setSecondaryPhones((prev) => prev.filter((_, idx) => idx !== i))}
                className="shrink-0 text-muted hover:text-red-light"
                aria-label="Remove phone"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setSecondaryPhones((prev) => [...prev, { value: "", type: "MOBILE" }])}
            className="font-condensed mt-1.5 text-[11px] font-bold tracking-[0.1em] text-teal-light uppercase hover:underline"
          >
            + Add phone
          </button>
        </div>

        <div>
          <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.1em] text-muted uppercase">
            Email
          </label>
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} onBlur={checkDuplicate} />
          {secondaryEmails.map((v, i) => (
            <div key={i} className="mt-2 flex items-center gap-2">
              <Input
                type="email"
                value={v}
                onChange={(e) => setSecondaryEmails((prev) => prev.map((row, idx) => (idx === i ? e.target.value : row)))}
                className="flex-1"
                placeholder="Additional email"
              />
              <button
                type="button"
                onClick={() => setSecondaryEmails((prev) => prev.filter((_, idx) => idx !== i))}
                className="shrink-0 text-muted hover:text-red-light"
                aria-label="Remove email"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setSecondaryEmails((prev) => [...prev, ""])}
            className="font-condensed mt-1.5 text-[11px] font-bold tracking-[0.1em] text-teal-light uppercase hover:underline"
          >
            + Add email
          </button>
        </div>

        {duplicate && (
          <div className="rounded-lg border border-amber/40 bg-amber/10 p-3 text-sm">
            <p className="text-amber">
              Duplicate found: <span className="font-semibold">{duplicate.firstName} {duplicate.lastName}</span> already uses this
              email/phone.
            </p>
            <Link
              href={`/agent/leads/${duplicate.id}`}
              target="_blank"
              className="font-condensed mt-1 inline-block text-[11px] font-bold tracking-wide text-teal-light uppercase hover:underline"
            >
              View Existing Contact →
            </Link>
          </div>
        )}

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

        <div>
          <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.1em] text-muted uppercase">
            Tags
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                style={{ backgroundColor: `${colorFor(tag)}26`, color: colorFor(tag) }}
                className="font-condensed inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide"
              >
                {tag}
                <button type="button" onClick={() => setTags((prev) => prev.filter((t) => t !== tag))} aria-label={`Remove ${tag}`}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="Create tag…"
              className="h-7 w-32 text-xs"
            />
          </div>
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

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={form.dndAll}
            onChange={(e) => setForm({ ...form, dndAll: e.target.checked })}
            className="h-4 w-4"
          />
          DND all channels
        </label>

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
