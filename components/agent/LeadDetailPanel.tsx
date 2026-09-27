"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Callout } from "@/components/ui/Callout";
import { LEAD_STATUS_LABELS, LeadStatus } from "@/lib/leadStatus";
import { LEAD_TYPE_LABELS, LeadType } from "@/lib/leadType";
import { cn } from "@/lib/cn";
import { formatPhone } from "@/lib/formatPhone";

const STATUS_OPTIONS: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "NO_ANSWER",
  "APPOINTMENT_BOOKING",
  "SOLD",
  "NOT_INTERESTED",
];

type Note = { id: string; body: string; createdAt: string; author: { name: string } | null };

type ContactLogEntry = {
  id: string;
  status: LeadStatus;
  createdAt: string;
  agent: { name: string } | null;
};

type Lead = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  state: string;
  dateOfBirth: string;
  status: LeadStatus;
  leadType: LeadType;
  isArchived: boolean;
  isVaulted: boolean;
  notes: Note[];
  contactLogEntries: ContactLogEntry[];
};

type Navigation = {
  prevId: string | null;
  nextId: string | null;
  position: number | null;
  total: number;
  filterQuery: string;
};

export function LeadDetailPanel({
  lead: initialLead,
  navigation,
  basePath = "/agent/leads",
  backHref = "/agent/dashboard",
  backLabel = "Back to My Leads",
  canEdit = false,
  canDelete = false,
}: {
  lead: Lead;
  navigation: Navigation;
  basePath?: string;
  backHref?: string;
  backLabel?: string;
  // Editing/deleting a lead's own details (not just its status) is a
  // My Leads-only concept — the shared Vault view never passes these, so
  // that flow is completely unaffected by default.
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  const router = useRouter();
  const [lead, setLead] = useState(initialLead);
  const [noteBody, setNoteBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: lead.firstName,
    lastName: lead.lastName,
    phone: lead.phone,
    state: lead.state,
    dateOfBirth: lead.dateOfBirth.slice(0, 10),
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const prevHref = navigation.prevId ? `${basePath}/${navigation.prevId}?${navigation.filterQuery}` : null;
  const nextHref = navigation.nextId ? `${basePath}/${navigation.nextId}?${navigation.filterQuery}` : null;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isEditing = target.tagName === "INPUT" || target.tagName === "TEXTAREA";
      if (isEditing) return;

      if (e.key === "ArrowLeft" && prevHref) {
        router.push(prevHref);
      } else if (e.key === "ArrowRight" && nextHref) {
        router.push(nextHref);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [prevHref, nextHref, router]);

  async function updateStatus(status: LeadStatus) {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/agent/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to update status");
      return;
    }
    setLead((prev) => ({
      ...prev,
      status: data.lead.status,
      isArchived: data.lead.isArchived,
      isVaulted: data.lead.isVaulted,
      contactLogEntries: data.lead.contactLogEntries,
    }));
    router.refresh();
  }

  function startEditing() {
    setEditForm({
      firstName: lead.firstName,
      lastName: lead.lastName,
      phone: lead.phone,
      state: lead.state,
      dateOfBirth: lead.dateOfBirth.slice(0, 10),
    });
    setEditError(null);
    setEditing(true);
  }

  async function saveEdit() {
    setEditSaving(true);
    setEditError(null);
    const res = await fetch(`/api/agent/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    const data = await res.json();
    setEditSaving(false);
    if (!res.ok) {
      setEditError(data.error ?? "Failed to save changes");
      return;
    }
    setLead((prev) => ({
      ...prev,
      firstName: data.lead.firstName,
      lastName: data.lead.lastName,
      phone: data.lead.phone,
      state: data.lead.state,
      dateOfBirth: data.lead.dateOfBirth,
    }));
    setEditing(false);
    router.refresh();
  }

  async function deleteLead() {
    if (!window.confirm(`Permanently delete ${lead.firstName} ${lead.lastName}? This can't be undone.`)) return;
    setDeleting(true);
    setDeleteError(null);
    const res = await fetch(`/api/agent/leads/${lead.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push(backHref);
      router.refresh();
      return;
    }
    const data = await res.json().catch(() => null);
    setDeleteError(data?.error ?? "Failed to delete lead");
    setDeleting(false);
  }

  async function addNote() {
    if (!noteBody.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/agent/leads/${lead.id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: noteBody }),
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      setLead((prev) => ({ ...prev, notes: [data.note, ...prev.notes] }));
      setNoteBody("");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href={backHref} className="text-sm text-muted hover:text-foreground">
          &larr; {backLabel}
        </Link>
        <div className="flex items-center gap-3">
          {navigation.position && (
            <span className="font-condensed text-xs font-bold tracking-[0.1em] text-muted uppercase">
              Lead {navigation.position} of {navigation.total}
            </span>
          )}
          <div className="flex gap-2">
            <Button variant="ghost" disabled={!prevHref} onClick={() => prevHref && router.push(prevHref)}>
              &larr; Prev
            </Button>
            <Button variant="ghost" disabled={!nextHref} onClick={() => nextHref && router.push(nextHref)}>
              Next &rarr;
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          {editing ? (
            <CardTitle>Edit Lead</CardTitle>
          ) : (
            <div>
              <CardTitle>
                {lead.firstName} {lead.lastName}
              </CardTitle>
              <p className="mt-1 text-sm text-muted">
                {formatPhone(lead.phone)} &middot; {lead.state} &middot; DOB{" "}
                {format(new Date(lead.dateOfBirth), "MM/dd/yyyy")} &middot; {LEAD_TYPE_LABELS[lead.leadType]}
              </p>
            </div>
          )}
          <div className="flex items-center gap-3">
            {!editing && (canEdit || canDelete) && !lead.isArchived && (
              <div className="flex gap-2">
                {canEdit && (
                  <Button variant="ghost" onClick={startEditing}>
                    Edit
                  </Button>
                )}
                {canDelete && (
                  <Button variant="ghost" onClick={deleteLead} disabled={deleting} className="!text-red-light">
                    {deleting ? "Deleting..." : "Delete"}
                  </Button>
                )}
              </div>
            )}
            {!editing && <StatusBadge status={lead.status} />}
          </div>
        </CardHeader>

        {editing && (
          <div className="mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="First Name"
                value={editForm.firstName}
                onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
              />
              <Input
                placeholder="Last Name"
                value={editForm.lastName}
                onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
              />
              <Input
                placeholder="Phone"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
              <Input
                placeholder="State"
                value={editForm.state}
                onChange={(e) => setEditForm({ ...editForm, state: e.target.value.toUpperCase() })}
                maxLength={2}
              />
              <Input
                type="date"
                value={editForm.dateOfBirth}
                onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
              />
            </div>
            {editError && <p className="text-sm text-red-light">{editError}</p>}
            <div className="flex gap-2">
              <Button onClick={saveEdit} disabled={editSaving}>
                {editSaving ? "Saving..." : "Save Changes"}
              </Button>
              <Button variant="ghost" onClick={() => setEditing(false)} disabled={editSaving}>
                Cancel
              </Button>
            </div>
          </div>
        )}
        {deleteError && <p className="mb-4 text-sm text-red-light">{deleteError}</p>}

        {!editing && lead.isVaulted && (
          <Callout variant="gold" className="mb-4">
            This is a shared Vault lead — any agent can call it. Marking it Appointment Booked or Sold
            claims it for you and removes it from the shared pool. Marking it Contacted, No Answer, or Not
            Interested keeps it shared, but logs your attempt below so other agents can see it before
            calling again.
          </Callout>
        )}

        {!editing && (lead.isArchived ? (
          <p className="rounded-[10px] border border-border bg-surface2 p-3 text-sm text-muted">
            This lead is {LEAD_STATUS_LABELS[lead.status].toLowerCase()} and locked — it has exited your active
            pool.
          </p>
        ) : (
          <div>
            <label className="font-condensed mb-2 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
              Update Status
            </label>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((status) => (
                <Button
                  key={status}
                  variant="secondary"
                  disabled={saving}
                  onClick={() => updateStatus(status)}
                  className={cn(status === lead.status && "!border-copper !bg-copper !text-black")}
                >
                  {LEAD_STATUS_LABELS[status]}
                </Button>
              ))}
            </div>
          </div>
        ))}
        {!editing && error && <p className="mt-3 text-sm text-red-light">{error}</p>}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact Log</CardTitle>
        </CardHeader>
        <p className="mb-3 text-sm text-muted">
          A record of every time this lead was marked Contacted, No Answer, or Not Interested — so you can
          see who&apos;s already reached out before calling.
        </p>
        <div className="space-y-2">
          {lead.contactLogEntries.length === 0 && <p className="text-sm text-muted">No contact attempts logged yet.</p>}
          {lead.contactLogEntries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between rounded-lg border border-border bg-surface2 px-3 py-2 text-sm"
            >
              <span className="font-semibold text-white">{LEAD_STATUS_LABELS[entry.status]}</span>
              <span className="text-xs text-muted">
                {entry.agent?.name ?? "Former Agent"} &middot; {format(new Date(entry.createdAt), "MMM d, yyyy h:mm a")}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <div className="mb-4 flex gap-2">
          <textarea
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
            placeholder="Add a note about this lead..."
            className="min-h-20 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-copper-dim focus:outline-none"
          />
          <Button onClick={addNote} disabled={saving || !noteBody.trim()}>
            Add
          </Button>
        </div>
        <div className="space-y-3">
          {lead.notes.length === 0 && <p className="text-sm text-muted">No notes yet.</p>}
          {lead.notes.map((note) => (
            <Callout key={note.id} variant="teal">
              <p className="text-white">{note.body}</p>
              <p className="mt-1 text-xs text-teal-light">
                {note.author?.name ?? "Former Agent"} &middot; {format(new Date(note.createdAt), "MMM d, yyyy h:mm a")}
              </p>
            </Callout>
          ))}
        </div>
      </Card>

      <p className="text-center text-xs text-muted">Tip: use the &larr; and &rarr; arrow keys to move between leads.</p>
    </div>
  );
}
