"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { X, Plus, Check, Phone as PhoneIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import { formatPhone, telHref } from "@/lib/formatPhone";

type Task = {
  id: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  completed: boolean;
};

type Note = { id: string; body: string; createdAt: string; author: { name: string } | null };

type ActivityEntry = {
  id: string;
  kind: "note" | "status" | "task";
  description: string;
  createdAt: string;
};

type DrawerContact = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  tags: string[];
  source: string | null;
};

// The Contacts table's row-click quick-view — editable fields/tags up top,
// Tasks/Notes/Activity tabs below. Fetches its own data by id rather than
// taking the already-loaded table row, since the table row is missing
// notes/full task list/contact-log history this needs.
export function ContactDrawer({ leadId, onClose }: { leadId: string; onClose: () => void }) {
  const [contact, setContact] = useState<DrawerContact | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"tasks" | "notes" | "activity">("tasks");
  const [newNote, setNewNote] = useState("");
  const [newTagInput, setNewTagInput] = useState("");
  const [newTask, setNewTask] = useState({ title: "", dueAt: "", description: "" });
  const [savingTask, setSavingTask] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [leadRes, tasksRes] = await Promise.all([
        fetch(`/api/agent/leads/${leadId}`),
        fetch(`/api/agent/lead-tasks?leadId=${leadId}&includeCompleted=true`),
      ]);
      if (cancelled) return;
      if (leadRes.ok) {
        const data = await leadRes.json();
        const lead = data.lead;
        setContact({
          id: lead.id,
          firstName: lead.firstName,
          lastName: lead.lastName,
          phone: lead.phone,
          email: lead.email,
          tags: lead.tags ?? [],
          source: lead.source,
        });
        setNotes(lead.notes ?? []);
        const statusActivity: ActivityEntry[] = (lead.contactLogEntries ?? []).map(
          (entry: { id: string; status: string; createdAt: string; agent: { name: string } | null }) => ({
            id: entry.id,
            kind: "status" as const,
            description: `Marked ${entry.status.replace(/_/g, " ").toLowerCase()} by ${entry.agent?.name ?? "former agent"}`,
            createdAt: entry.createdAt,
          }),
        );
        setActivity(statusActivity);
      }
      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setTasks(data.tasks ?? []);
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [leadId]);

  async function addTag() {
    const tag = newTagInput.trim();
    if (!tag || !contact) return;
    setNewTagInput("");
    const next = Array.from(new Set([...contact.tags, tag]));
    setContact({ ...contact, tags: next });
    await fetch(`/api/agent/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: next }),
    });
  }

  async function removeTag(tag: string) {
    if (!contact) return;
    const next = contact.tags.filter((t) => t !== tag);
    setContact({ ...contact, tags: next });
    await fetch(`/api/agent/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: next }),
    });
  }

  async function toggleTask(task: Task) {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t)));
    await fetch(`/api/agent/lead-tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !task.completed }),
    });
  }

  async function addTask() {
    if (!newTask.title.trim()) return;
    setSavingTask(true);
    try {
      const res = await fetch("/api/agent/lead-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          title: newTask.title,
          dueAt: newTask.dueAt || null,
          description: newTask.description,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setTasks((prev) => [...prev, data.task]);
        setNewTask({ title: "", dueAt: "", description: "" });
      }
    } finally {
      setSavingTask(false);
    }
  }

  async function addNote() {
    if (!newNote.trim()) return;
    const res = await fetch(`/api/agent/leads/${leadId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: newNote }),
    });
    if (res.ok) {
      const data = await res.json();
      setNotes((prev) => [data.note, ...prev]);
      setNewNote("");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-border bg-surface shadow-[0_0_60px_rgba(0,0,0,0.6)]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-6 py-4">
          <h2 className="font-condensed text-lg font-extrabold tracking-wide text-white uppercase">
            {contact ? `${contact.firstName} ${contact.lastName}` : "Contact"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface2 hover:text-white"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {loading || !contact ? (
          <div className="p-6 text-sm text-muted">Loading…</div>
        ) : (
          <div className="flex flex-1 flex-col">
            <div className="space-y-3 border-b border-border p-6">
              <a
                href={telHref(contact.phone)}
                className="inline-flex items-center gap-1.5 font-semibold metal-copper-text hover:underline"
              >
                <PhoneIcon className="h-3.5 w-3.5" />
                {formatPhone(contact.phone)}
              </a>
              {contact.email && <p className="text-sm text-muted">{contact.email}</p>}
              <div>
                <label className="font-condensed mb-1.5 block text-[11px] font-bold tracking-[0.1em] text-muted uppercase">
                  Tags
                </label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {contact.tags.map((tag) => (
                    <span
                      key={tag}
                      className="font-condensed inline-flex items-center gap-1 rounded-full bg-copper-glow px-2.5 py-1 text-[11px] font-bold tracking-wide text-copper"
                    >
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} aria-label={`Remove ${tag}`}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <Input
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder="Add tag…"
                    className="h-7 w-28 text-xs"
                  />
                </div>
              </div>
              <Link
                href={`/agent/leads/${contact.id}`}
                className="font-condensed inline-block text-[11px] font-bold tracking-wide text-teal-light uppercase hover:underline"
              >
                Open full contact page →
              </Link>
            </div>

            <div className="flex border-b border-border">
              {(["tasks", "notes", "activity"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={cn(
                    "font-condensed flex-1 border-b-2 px-4 py-3 text-xs font-bold tracking-[0.1em] uppercase transition-colors",
                    tab === t ? "border-copper-gradient text-white" : "border-transparent text-muted hover:text-foreground",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="flex-1 space-y-3 p-6">
              {tab === "tasks" && (
                <>
                  {tasks.length === 0 && <p className="text-sm text-muted">No tasks yet.</p>}
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 rounded-lg border border-border bg-surface2 p-3"
                    >
                      <button
                        type="button"
                        onClick={() => toggleTask(task)}
                        className={cn(
                          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2",
                          task.completed ? "border-green-light bg-green-light/20" : "border-border",
                        )}
                      >
                        {task.completed && <Check className="h-3.5 w-3.5 text-green-light" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-sm font-semibold", task.completed ? "text-muted line-through" : "text-foreground")}>
                          {task.title}
                        </p>
                        {task.dueAt && (
                          <p className="text-xs text-muted">Due {format(new Date(task.dueAt), "MMM d, yyyy")}</p>
                        )}
                        {task.description && <p className="mt-1 text-xs text-muted">{task.description}</p>}
                      </div>
                    </div>
                  ))}
                  <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
                    <Input
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      placeholder="New task title"
                    />
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        value={newTask.dueAt}
                        onChange={(e) => setNewTask({ ...newTask, dueAt: e.target.value })}
                        className="flex-1"
                      />
                      <Button onClick={addTask} disabled={savingTask || !newTask.title.trim()}>
                        <Plus className="h-4 w-4" />
                        Add
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {tab === "notes" && (
                <>
                  <div className="flex gap-2">
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add a note…"
                      className="min-h-16 w-full resize-none rounded-lg border-copper-focus-gradient bg-surface2 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none"
                    />
                    <Button onClick={addNote} disabled={!newNote.trim()}>
                      Add
                    </Button>
                  </div>
                  {notes.length === 0 && <p className="text-sm text-muted">No notes yet.</p>}
                  {notes.map((note) => (
                    <div key={note.id} className="rounded-lg border border-border bg-surface2 p-3">
                      <p className="text-sm text-foreground">{note.body}</p>
                      <p className="mt-1 text-xs text-muted">
                        {note.author?.name ?? "Former agent"} · {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  ))}
                </>
              )}

              {tab === "activity" && (
                <>
                  {activity.length === 0 && <p className="text-sm text-muted">No activity logged yet.</p>}
                  {activity.map((entry) => (
                    <div key={entry.id} className="border-l-2 border-copper-dim pl-3 text-sm">
                      <p className="text-foreground">{entry.description}</p>
                      <p className="text-xs text-muted">{formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}</p>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
