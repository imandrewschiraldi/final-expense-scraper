"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Flag, Home, Phone as PhoneIcon, Shield, CheckSquare, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Callout } from "@/components/ui/Callout";
import { LEAD_STATUS_LABELS, LeadStatus } from "@/lib/leadStatus";
import { LEAD_TYPE_LABELS, LeadType } from "@/lib/leadType";
import { cn } from "@/lib/cn";
import { formatPhone, telHref } from "@/lib/formatPhone";
import { formatDob } from "@/lib/formatDob";

function PhoneLink({ phone }: { phone: string }) {
  return (
    <a
      href={telHref(phone)}
      className="inline-flex items-center gap-1 font-semibold text-copper transition-colors hover:text-copper-dim hover:underline"
    >
      <PhoneIcon className="h-3.5 w-3.5 shrink-0" />
      {formatPhone(phone)}
    </a>
  );
}

type MailerLead = {
  firstName: string;
  lastName: string;
  phone: string;
  state: string;
  dateOfBirth: string | null;
  leadType: LeadType;
  address?: string | null;
  email?: string | null;
  coverageAmountRequested?: string | null;
};

const MAILER_THEME: Record<
  "VETERANS_FINAL_EXPENSE" | "MORTGAGE_PROTECTION",
  {
    titleLines: [string, string];
    ribbon: string;
    checkboxLabel: string;
    band: string;
    ribbonGradient: string;
    icon: LucideIcon;
  }
> = {
  VETERANS_FINAL_EXPENSE: {
    titleLines: ["Veteran's Final Expense", "& Planning Guide"],
    ribbon: "Information Request Form",
    checkboxLabel: "Final Expense benefits information requested",
    band: "linear-gradient(135deg, #1b2a4a, #2c4270)",
    ribbonGradient: "linear-gradient(90deg, #7a1c28, #b9324a, #7a1c28)",
    icon: Flag,
  },
  MORTGAGE_PROTECTION: {
    titleLines: ["Mortgage Protection &", "Home Equity Assurance Guide"],
    ribbon: "Property Secure Form",
    checkboxLabel: "Mortgage Protection benefits & quote requested",
    band: "linear-gradient(135deg, #1b2a4a, #2c4270)",
    ribbonGradient: "linear-gradient(90deg, var(--copper-dim), var(--copper), var(--copper-dim))",
    icon: Home,
  },
};

function isMailerLeadType(leadType: LeadType): leadType is keyof typeof MAILER_THEME {
  return leadType === "VETERANS_FINAL_EXPENSE" || leadType === "MORTGAGE_PROTECTION";
}

/** A header styled after the agency's own printed mailers (bold banner,
 *  ribbon subhead, labeled form rows, gold frame) for the two lead types
 *  that actually have a matching mailer — auto-filled with this lead's
 *  real data rather than reproducing the template's own fields verbatim
 *  (e.g. there's no "loan provider" in our data, so that row becomes
 *  Coverage Requested instead — every field shown here is real). Bleeds to
 *  the card's edges the same way the old type banner did; `actions` is the
 *  Edit/Delete/status cluster, rendered inline in the top band so the
 *  functional controls aren't lost under the mailer artwork. */
function MailerLeadHeader({ lead, actions }: { lead: MailerLead; actions: React.ReactNode }) {
  const theme = MAILER_THEME[lead.leadType as keyof typeof MAILER_THEME];
  const Icon = theme.icon;
  const fullName = `${lead.firstName} ${lead.lastName}`;

  const fields: { label: string; value: React.ReactNode }[] =
    lead.leadType === "VETERANS_FINAL_EXPENSE"
      ? [
          { label: "Full Name", value: fullName },
          { label: "Phone Number", value: <PhoneLink phone={lead.phone} /> },
          { label: "Date of Birth", value: formatDob(lead.dateOfBirth) },
          { label: "State of Residence", value: lead.state },
        ]
      : [
          { label: "Full Name", value: fullName },
          { label: "Phone Number", value: <PhoneLink phone={lead.phone} /> },
          { label: "Property Address", value: lead.address || "—" },
          { label: "Email Address", value: lead.email || "—" },
          { label: "Coverage Requested", value: lead.coverageAmountRequested || "—" },
        ];

  return (
    <div className="-mx-5 -mt-5 mb-4 overflow-hidden rounded-t-[9px] bg-gradient-to-br from-[#9a7b3f] via-[#d9c08a] to-[#9a7b3f] p-[4px]">
      <div className="overflow-hidden rounded-t-[7px] bg-surface">
        <div className="flex items-start justify-between gap-3 px-4 py-3 sm:px-5" style={{ background: theme.band }}>
          <div>
            {theme.titleLines.map((line) => (
              <p
                key={line}
                className="font-condensed text-base leading-tight font-extrabold tracking-wide text-white uppercase sm:text-lg"
              >
                {line}
              </p>
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        </div>

        <div className="flex items-center justify-center py-1.5" style={{ background: theme.ribbonGradient }}>
          <span className="font-condensed text-[11px] font-extrabold tracking-[0.16em] text-white uppercase">
            {theme.ribbon}
          </span>
        </div>

        <div className="flex items-start justify-between gap-4 px-4 py-4 sm:px-5">
          <dl className="grid flex-1 grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.label}>
                <dt className="font-condensed text-[10px] font-bold tracking-[0.1em] text-muted uppercase">
                  {f.label}
                </dt>
                <dd className="truncate border-b border-dashed border-copper-dim/40 pb-1 text-sm font-semibold text-white">
                  {f.value}
                </dd>
              </div>
            ))}
          </dl>
          <Icon className="mt-1 hidden h-14 w-14 shrink-0 text-copper-dim/40 sm:block" />
        </div>

        <div className="flex items-center gap-1.5 px-4 pb-3 text-xs text-muted sm:px-5">
          <CheckSquare className="h-3.5 w-3.5 shrink-0 text-copper" />
          {theme.checkboxLabel}
        </div>

        <div className="flex justify-center border-t border-dashed border-copper-dim/25 py-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-copper-dim/50 bg-surface2">
            <Shield className="h-3.5 w-3.5 text-copper-dim" />
          </div>
        </div>
      </div>
    </div>
  );
}

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
  dateOfBirth: string | null;
  status: LeadStatus;
  leadType: LeadType;
  isArchived: boolean;
  isVaulted: boolean;
  notes: Note[];
  contactLogEntries: ContactLogEntry[];
  email?: string | null;
  address?: string | null;
  zip?: string | null;
  county?: string | null;
  beneficiary?: string | null;
  beneficiaryRelationship?: string | null;
  gender?: string | null;
  maritalStatus?: string | null;
  height?: string | null;
  weight?: string | null;
  tobaccoUse?: boolean | null;
  occupation?: string | null;
  income?: string | null;
  existingCoverage?: string | null;
  coverageAmountRequested?: string | null;
  militaryBranch?: string | null;
  vendorNotes?: string | null;
};

const SUPPLEMENTAL_FIELDS: { key: keyof Lead; label: string }[] = [
  { key: "email", label: "Email" },
  { key: "address", label: "Address" },
  { key: "zip", label: "ZIP" },
  { key: "county", label: "County" },
  { key: "beneficiary", label: "Beneficiary" },
  { key: "beneficiaryRelationship", label: "Beneficiary Relationship" },
  { key: "gender", label: "Gender" },
  { key: "maritalStatus", label: "Marital Status" },
  { key: "height", label: "Height" },
  { key: "weight", label: "Weight" },
  { key: "occupation", label: "Occupation" },
  { key: "income", label: "Income" },
  { key: "existingCoverage", label: "Existing Coverage" },
  { key: "coverageAmountRequested", label: "Coverage Requested" },
  { key: "militaryBranch", label: "Military Branch" },
  { key: "vendorNotes", label: "Source Notes" },
];

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
  const searchParams = useSearchParams();
  // Set on the Prev/Next hrefs below and read back after navigating, so the
  // newly-mounted card knows which way it should slide in from. Absent on
  // a fresh/direct visit (from the lead list, a bookmark, etc.), where no
  // slide direction makes sense.
  const navDirection = searchParams.get("dir");
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
    dateOfBirth: lead.dateOfBirth?.slice(0, 10) ?? "",
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function navHref(id: string, dir: "prev" | "next") {
    const params = new URLSearchParams(navigation.filterQuery);
    params.set("dir", dir);
    return `${basePath}/${id}?${params.toString()}`;
  }
  const prevHref = navigation.prevId ? navHref(navigation.prevId, "prev") : null;
  const nextHref = navigation.nextId ? navHref(navigation.nextId, "next") : null;

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
      dateOfBirth: lead.dateOfBirth?.slice(0, 10) ?? "",
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
      dateOfBirth: data.lead.dateOfBirth ?? null,
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

  // Shared between the mailer-style header (rendered inline in its navy
  // band) and the plain CardHeader for other lead types, so Edit/Delete/
  // status stay in exactly one place instead of two near-duplicate blocks.
  const headerActions = (
    <>
      {(canEdit || canDelete) && !lead.isArchived && (
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
      <StatusBadge status={lead.status} />
    </>
  );

  return (
    <div className="space-y-6">
      <div className="mt-3 flex items-center justify-between">
        <Link href={backHref} className="text-sm text-muted hover:text-foreground">
          &larr; {backLabel}
        </Link>
        <div className="flex items-center gap-3">
          {navigation.position && (
            <span className="font-condensed metal-copper-text text-xs font-bold tracking-[0.1em] uppercase">
              Lead {navigation.position} of {navigation.total}
            </span>
          )}
          <div className="flex gap-2">
            <Button
              variant="ghost"
              className="metal-copper-text"
              disabled={!prevHref}
              onClick={() => prevHref && router.push(prevHref)}
            >
              &larr; Prev
            </Button>
            <Button
              variant="ghost"
              className="metal-copper-text"
              disabled={!nextHref}
              onClick={() => nextHref && router.push(nextHref)}
            >
              Next &rarr;
            </Button>
          </div>
        </div>
      </div>

      <Card
        key={lead.id}
        className={cn(
          "relative overflow-hidden before:pointer-events-none before:absolute before:inset-[6px] before:rounded-[6px] before:border before:border-dashed before:border-copper-dim/25",
          navDirection === "next" && "animate-lead-card-next",
          navDirection === "prev" && "animate-lead-card-prev",
        )}
      >
        {editing ? (
          <CardHeader>
            <CardTitle>Edit Lead</CardTitle>
          </CardHeader>
        ) : isMailerLeadType(lead.leadType) ? (
          <MailerLeadHeader lead={lead} actions={headerActions} />
        ) : (
          <CardHeader>
            <div>
              <CardTitle>
                {lead.firstName} {lead.lastName}
              </CardTitle>
              <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-muted">
                <PhoneLink phone={lead.phone} />
                <span>
                  &middot; {lead.state} &middot; DOB {formatDob(lead.dateOfBirth)} &middot;{" "}
                  {LEAD_TYPE_LABELS[lead.leadType]}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              {headerActions}
            </div>
          </CardHeader>
        )}

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
                placeholder="Date of Birth (optional)"
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

      {!editing &&
        (() => {
          // Mortgage Protection's mailer header already shows address/email/
          // coverage requested up top — no need to repeat them down here.
          const mailerFieldKeys: (keyof Lead)[] =
            lead.leadType === "MORTGAGE_PROTECTION" ? ["address", "email", "coverageAmountRequested"] : [];
          const populated = SUPPLEMENTAL_FIELDS.filter((f) => lead[f.key] && !mailerFieldKeys.includes(f.key));
          if (populated.length === 0 && !lead.tobaccoUse) return null;
          return (
            <Card>
              <CardHeader>
                <CardTitle>Additional Info</CardTitle>
              </CardHeader>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                {populated.map((f) => (
                  <div key={f.key}>
                    <dt className="font-condensed text-[11px] font-bold tracking-[0.1em] text-muted uppercase">
                      {f.label}
                    </dt>
                    <dd className="text-white">{String(lead[f.key])}</dd>
                  </div>
                ))}
                {lead.tobaccoUse != null && (
                  <div>
                    <dt className="font-condensed text-[11px] font-bold tracking-[0.1em] text-muted uppercase">
                      Tobacco Use
                    </dt>
                    <dd className="text-white">{lead.tobaccoUse ? "Yes" : "No"}</dd>
                  </div>
                )}
              </dl>
            </Card>
          );
        })()}

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
