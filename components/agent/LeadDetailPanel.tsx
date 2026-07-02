"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Callout } from "@/components/ui/Callout";
import { LEAD_STATUS_LABELS, LeadStatus } from "@/lib/leadStatus";
import { cn } from "@/lib/cn";

const STATUS_OPTIONS: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "NO_ANSWER",
  "APPOINTMENT_BOOKING",
  "SOLD",
  "NOT_INTERESTED",
];

type Note = { id: string; body: string; createdAt: string; author: { name: string } };

type Lead = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  state: string;
  dateOfBirth: string;
  status: LeadStatus;
  isArchived: boolean;
  notes: Note[];
};

export function LeadDetailPanel({ lead: initialLead }: { lead: Lead }) {
  const router = useRouter();
  const [lead, setLead] = useState(initialLead);
  const [noteBody, setNoteBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setLead((prev) => ({ ...prev, status: data.lead.status, isArchived: data.lead.isArchived }));
    router.refresh();
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
      <Card>
        <CardHeader>
          <div>
            <CardTitle>
              {lead.firstName} {lead.lastName}
            </CardTitle>
            <p className="mt-1 text-sm text-muted">
              {lead.phone} &middot; {lead.state} &middot; DOB {format(new Date(lead.dateOfBirth), "MM/dd/yyyy")}
            </p>
          </div>
          <StatusBadge status={lead.status} />
        </CardHeader>

        {lead.isArchived ? (
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
        )}
        {error && <p className="mt-3 text-sm text-red-light">{error}</p>}
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
                {note.author.name} &middot; {format(new Date(note.createdAt), "MMM d, yyyy h:mm a")}
              </p>
            </Callout>
          ))}
        </div>
      </Card>
    </div>
  );
}
