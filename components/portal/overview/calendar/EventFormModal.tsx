"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { CalendarEventRecord } from "@/lib/calendarRecurrence";

function toDateInputValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function toTimeInputValue(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** One hour after `base`, rounded down to the hour — the sane default end
 *  time for a freshly-opened "new event" form, same as Google Calendar's
 *  own default. */
function defaultEndTime(base: Date): string {
  const d = new Date(base);
  d.setHours(d.getHours() + 1);
  return toTimeInputValue(d);
}

type FormFields = {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  description: string;
  link: string;
  phoneNumber: string;
  location: string;
  recurring: boolean;
  recurrenceEndDate: string;
};

function fieldsFor(
  event: CalendarEventRecord | null,
  initialDate: Date,
): FormFields {
  if (event) {
    return {
      title: event.title,
      date: toDateInputValue(event.startAt),
      startTime: toTimeInputValue(event.startAt),
      endTime: toTimeInputValue(event.endAt),
      description: event.description ?? "",
      link: event.link ?? "",
      phoneNumber: event.phoneNumber ?? "",
      location: event.location ?? "",
      recurring: event.recurring,
      recurrenceEndDate: event.recurrenceEndAt
        ? toDateInputValue(event.recurrenceEndAt)
        : "",
    };
  }
  const date = toDateInputValue(initialDate);
  return {
    title: "",
    date,
    startTime: "09:00",
    endTime: defaultEndTime(new Date(`${date}T09:00`)),
    description: "",
    link: "",
    phoneNumber: "",
    location: "",
    recurring: false,
    recurrenceEndDate: "",
  };
}

export type CalendarEventFormValues = {
  title: string;
  description: string;
  link: string;
  phoneNumber: string;
  location: string;
  startAt: string; // ISO
  endAt: string; // ISO
  recurring: boolean;
  recurrenceEndAt: string | null; // ISO or null
};

/** Admin-only create/edit form — one event "series" at a time. Editing a
 *  recurring event edits the whole series (its anchor date/time and
 *  everything else), not just the occurrence that was clicked through to
 *  get here; there's no per-occurrence override in this schema. */
export function EventFormModal({
  open,
  onClose,
  event,
  initialDate,
  onSubmit,
  saving,
  error,
}: {
  open: boolean;
  onClose: () => void;
  // Null = creating a new event. Present = editing this one.
  event: CalendarEventRecord | null;
  // Only used when creating — the date the form should default to (e.g.
  // whatever day was in view when "Add Event" was clicked).
  initialDate: Date;
  onSubmit: (values: CalendarEventFormValues) => void;
  saving: boolean;
  error: string | null;
}) {
  const [fields, setFields] = useState<FormFields>(() =>
    fieldsFor(event, initialDate),
  );

  // Reset to the right starting values every time the form opens, rather
  // than tracking each field's diff against props — simplest way to make
  // "open the form for event A, close it, open it for event B" always show
  // B's values instead of A's leftovers. One setState call (not one per
  // field) since this is the kind of prop->state sync React's own lint
  // rule wants kept to a single update per effect run.
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFields(fieldsFor(event, initialDate));
  }, [open, event, initialDate]);

  function update<K extends keyof FormFields>(key: K, value: FormFields[K]) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { title, date, startTime, endTime } = fields;
    if (!title.trim() || !date || !startTime || !endTime) return;
    onSubmit({
      title: title.trim(),
      description: fields.description,
      link: fields.link,
      phoneNumber: fields.phoneNumber,
      location: fields.location,
      startAt: new Date(`${date}T${startTime}`).toISOString(),
      endAt: new Date(`${date}T${endTime}`).toISOString(),
      recurring: fields.recurring,
      recurrenceEndAt:
        fields.recurring && fields.recurrenceEndDate
          ? new Date(`${fields.recurrenceEndDate}T23:59`).toISOString()
          : null,
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={event ? "Edit Event" : "Add Event"}
      maxWidthClassName="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
            Title
          </label>
          <Input
            value={fields.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="e.g. East Coast Pinnacle Connect"
            required
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
              Date
            </label>
            <Input
              type="date"
              value={fields.date}
              onChange={(e) => update("date", e.target.value)}
              required
            />
          </div>
          <div>
            <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
              Start
            </label>
            <Input
              type="time"
              value={fields.startTime}
              onChange={(e) => update("startTime", e.target.value)}
              required
            />
          </div>
          <div>
            <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
              End
            </label>
            <Input
              type="time"
              value={fields.endTime}
              onChange={(e) => update("endTime", e.target.value)}
              required
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={fields.recurring}
            onChange={(e) => update("recurring", e.target.checked)}
            className="h-4 w-4 rounded border-border accent-[var(--copper-metal)]"
          />
          Repeats weekly on this day
        </label>

        {fields.recurring && (
          <div>
            <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
              Ends on (optional)
            </label>
            <Input
              type="date"
              value={fields.recurrenceEndDate}
              onChange={(e) => update("recurrenceEndDate", e.target.value)}
            />
            <p className="mt-1 text-xs text-muted">
              Leave blank to repeat indefinitely.
            </p>
          </div>
        )}

        <div>
          <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
            Link
          </label>
          <Input
            type="url"
            value={fields.link}
            onChange={(e) => update("link", e.target.value)}
            placeholder="Zoom / video call / signup link"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
              Phone Number
            </label>
            <Input
              type="tel"
              value={fields.phoneNumber}
              onChange={(e) => update("phoneNumber", e.target.value)}
              placeholder="Dial-in number"
            />
          </div>
          <div>
            <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
              Location
            </label>
            <Input
              value={fields.location}
              onChange={(e) => update("location", e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>

        <div>
          <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
            Description
          </label>
          <textarea
            value={fields.description}
            onChange={(e) => update("description", e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-copper-focus-gradient bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none"
            placeholder="Notes for whoever's attending"
          />
        </div>

        {error && <p className="text-sm text-red-light">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : event ? "Save Changes" : "Add Event"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
