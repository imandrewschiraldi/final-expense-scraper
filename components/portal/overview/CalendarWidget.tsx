"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { MonthGrid } from "@/components/portal/overview/calendar/MonthGrid";
import { TimeGrid } from "@/components/portal/overview/calendar/TimeGrid";
import { EventDetailsModal } from "@/components/portal/overview/calendar/EventDetailsModal";
import {
  EventFormModal,
  type CalendarEventFormValues,
} from "@/components/portal/overview/calendar/EventFormModal";
import {
  addDays,
  expandOccurrences,
  monthGridRange,
  startOfDay,
  startOfWeek,
  type CalendarEventRecord,
  type CalendarOccurrence,
} from "@/lib/calendarRecurrence";
import { shiftToZone } from "@/lib/timeZoneMath";

type View = "month" | "week" | "day";
// Which endpoint a create/edit/delete goes to — an agency event is always
// admin-only; a personal one always belongs to (and is only editable by)
// whoever owns it. Tracked alongside formTarget/detailsOccurrence rather
// than re-derived from them everywhere, since "creating a brand new
// personal event" has no occurrence to derive it from yet.
type EventScope = "AGENCY" | "PERSONAL";

function eventUrl(scope: EventScope, id?: string): string {
  const base =
    scope === "AGENCY"
      ? "/api/admin/calendar-events"
      : "/api/portal/calendar-events";
  return id ? `${base}/${id}` : base;
}

function parseEvent(raw: {
  id: string;
  title: string;
  description: string | null;
  link: string | null;
  phoneNumber: string | null;
  location: string | null;
  startAt: string;
  endAt: string;
  allDay: boolean;
  color: string;
  scope: "AGENCY" | "PERSONAL";
  ownerId: string | null;
  recurrenceRule: CalendarEventRecord["recurrenceRule"];
  recurrenceEndAt: string | null;
}): CalendarEventRecord {
  return {
    ...raw,
    startAt: new Date(raw.startAt),
    endAt: new Date(raw.endAt),
    recurrenceEndAt: raw.recurrenceEndAt ? new Date(raw.recurrenceEndAt) : null,
  };
}

/** The display copy of a fetched event — its time fields shifted into the
 *  viewer's chosen zone (see lib/timeZoneMath.ts) so every bit of grid
 *  math downstream (which day it lands on, where in a day column, its
 *  shown time) reads correctly with no zone-awareness of its own. Never
 *  used for editing — an edit needs the real, un-shifted event (see
 *  openEditForm below), since the create/edit form always works in the
 *  browser's own local time, independent of this viewing preference. */
function shiftEventToZone(
  event: CalendarEventRecord,
  timeZone?: string,
): CalendarEventRecord {
  if (!timeZone) return event;
  return {
    ...event,
    startAt: shiftToZone(event.startAt, timeZone),
    endAt: shiftToZone(event.endAt, timeZone),
    recurrenceEndAt: event.recurrenceEndAt
      ? shiftToZone(event.recurrenceEndAt, timeZone)
      : null,
  };
}

/** Modeled on Google Calendar's own month/week/day views: month defaults,
 *  click through to week or day for the full time-grid. Shows every
 *  agency-wide event (admin-created training, company events) plus the
 *  viewer's own personal ones (their own additions, and anything Book of
 *  Business created for them — an appointment, a policy follow-up, an
 *  Annual Review). Used both as the Overview page's compact widget and as
 *  the full `/calendar` page (see `heading`/`defaultAddScope`). */
export function CalendarWidget({ heading = "Calendar" }: { heading?: string }) {
  const { data: session } = useSession();
  const isAdmin = session?.user.role === "ADMIN";
  const userId = session?.user.id;

  const [events, setEvents] = useState<CalendarEventRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("month");
  const [anchor, setAnchor] = useState(() => new Date());

  const [detailsOccurrence, setDetailsOccurrence] =
    useState<CalendarOccurrence | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formScope, setFormScope] = useState<EventScope>("PERSONAL");
  const [formTarget, setFormTarget] = useState<CalendarEventRecord | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // Undefined (not set on Profile) means every shift below is a no-op —
  // the original, unchanged behavior (browser-local throughout) for anyone
  // without a Profile zone set.
  const [timeZone, setTimeZone] = useState<string | undefined>(undefined);

  function loadEvents() {
    fetch("/api/portal/calendar-events")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.events) setEvents(data.events.map(parseEvent));
      })
      .catch(() => setError("Failed to load the calendar."));
  }

  useEffect(() => {
    loadEvents();
    fetch("/api/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setTimeZone(data?.profile?.timeZone || undefined))
      .catch(() => {});
  }, []);
  // `anchor` starts as a real "now" (set above, before Profile has loaded)
  // — once timeZone actually comes in, re-anchor to the shifted equivalent
  // of wherever it currently points (initially "now," or wherever the
  // viewer already navigated to in the brief window before this ran).
  // Only ever fires once, on the transition from no zone known yet to
  // whatever Profile has; timeZone never changes again within this
  // component's lifetime otherwise.
  useEffect(() => {
    if (timeZone) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAnchor((prev) => shiftToZone(prev, timeZone));
    }
  }, [timeZone]);

  // Every other date this component and everything under it deals with —
  // `anchor`, `range`, `days`, `today` — lives in this same "shifted"
  // space once timeZone is known (see lib/timeZoneMath.ts), which is what
  // makes startOfWeek/startOfDay/addDays/monthGridRange/expandOccurrences
  // below, and every day/time read in MonthGrid and TimeGrid, correctly
  // zone-aware with no changes of their own — they only ever need to read
  // a Date's own local fields, and those fields are already right.
  const shiftedEvents = useMemo(
    () => events?.map((e) => shiftEventToZone(e, timeZone)) ?? null,
    [events, timeZone],
  );
  const today = useMemo(() => shiftToZone(new Date(), timeZone), [timeZone]);

  const range = useMemo(() => {
    if (view === "month") return monthGridRange(anchor);
    if (view === "week") {
      const start = startOfWeek(anchor);
      return { start, end: addDays(start, 7) };
    }
    const start = startOfDay(anchor);
    return { start, end: addDays(start, 1) };
  }, [view, anchor]);

  const occurrences = useMemo(
    () =>
      shiftedEvents
        ? expandOccurrences(shiftedEvents, range.start, range.end)
        : [],
    [shiftedEvents, range],
  );

  const days = useMemo(() => {
    if (view === "day") return [startOfDay(anchor)];
    const start = startOfWeek(anchor);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [view, anchor]);

  function step(direction: 1 | -1) {
    if (view === "month") {
      setAnchor((d) => new Date(d.getFullYear(), d.getMonth() + direction, 1));
    } else if (view === "week") {
      setAnchor((d) => addDays(d, 7 * direction));
    } else {
      setAnchor((d) => addDays(d, direction));
    }
  }

  function goToDay(date: Date) {
    setAnchor(date);
    setView("day");
  }

  function openOccurrence(occurrence: CalendarOccurrence) {
    setDetailsOccurrence(occurrence);
  }

  // Can the viewer manage (edit/delete) this occurrence at all? An admin
  // managing an agency event, or anyone managing their own personal one —
  // never another agent's personal event, never an agency event as a
  // non-admin.
  const canManageOccurrence = (occ: CalendarOccurrence) =>
    occ.scope === "AGENCY" ? isAdmin : occ.ownerId === userId;

  function openCreateForm(scope: EventScope) {
    setFormScope(scope);
    setFormTarget(null);
    setFormError(null);
    setFormOpen(true);
  }

  function openEditForm() {
    if (!detailsOccurrence || !canManageOccurrence(detailsOccurrence)) return;
    setFormScope(detailsOccurrence.scope);
    // The raw (un-shifted) record, not detailsOccurrence itself — editing
    // always works in the browser's own local time (same as creating
    // always has), independent of the viewing-zone preference that
    // detailsOccurrence's times have already been shifted through.
    const raw = events?.find((e) => e.id === detailsOccurrence.id);
    setFormTarget(raw ?? detailsOccurrence);
    setDetailsOccurrence(null);
    setFormError(null);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!detailsOccurrence || !canManageOccurrence(detailsOccurrence)) return;
    if (
      !window.confirm(
        `Delete "${detailsOccurrence.title}"? This removes every upcoming occurrence.`,
      )
    ) {
      return;
    }
    setDeleting(true);
    const res = await fetch(
      eventUrl(detailsOccurrence.scope, detailsOccurrence.id),
      { method: "DELETE" },
    );
    setDeleting(false);
    if (res.ok) {
      setDetailsOccurrence(null);
      loadEvents();
    }
  }

  async function handleSubmit(values: CalendarEventFormValues) {
    setSaving(true);
    setFormError(null);
    const res = await fetch(eventUrl(formScope, formTarget?.id), {
      method: formTarget ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setSaving(false);
    if (res.ok) {
      setFormOpen(false);
      loadEvents();
    } else {
      const data = await res.json().catch(() => null);
      setFormError(data?.error ?? "Failed to save the event.");
    }
  }

  const headerLabel = useMemo(() => {
    if (view === "month") {
      return anchor.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    }
    if (view === "week") {
      const start = startOfWeek(anchor);
      const end = addDays(start, 6);
      const sameMonth = start.getMonth() === end.getMonth();
      return sameMonth
        ? `${start.toLocaleDateString("en-US", { month: "long" })} ${start.getDate()} – ${end.getDate()}, ${end.getFullYear()}`
        : `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return anchor.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }, [view, anchor]);

  return (
    <Card className="flex flex-col p-5">
      <CardHeader className="flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays
            className="h-[18px] w-[18px]"
            style={{ color: "var(--copper-metal-hi)" }}
          />
          <CardTitle className="text-[15.5px]">{heading}</CardTitle>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => openCreateForm("AGENCY")}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Agency Event
            </Button>
          )}
          <Button type="button" onClick={() => openCreateForm("PERSONAL")}>
            <Plus className="h-3.5 w-3.5" />
            Add My Event
          </Button>
          <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
            {(["month", "week", "day"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`font-condensed rounded-md px-2.5 py-1 text-[11px] font-bold tracking-[0.06em] uppercase transition-colors ${
                  view === v
                    ? "bg-surface2 text-white"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous"
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface2 hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setAnchor(shiftToZone(new Date(), timeZone))}
              className="font-condensed rounded-md border border-border px-2.5 py-1 text-[11px] font-bold tracking-[0.06em] text-muted uppercase transition-colors hover:text-foreground"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next"
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface2 hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardHeader>

      <p className="font-condensed mb-3 text-[13px] font-bold tracking-wide text-foreground uppercase">
        {headerLabel}
      </p>

      {error ? (
        <p className="text-sm text-red-light">{error}</p>
      ) : !events ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : view === "month" ? (
        <MonthGrid
          monthAnchor={anchor}
          occurrences={occurrences}
          onDayClick={goToDay}
          onEventClick={openOccurrence}
          today={today}
        />
      ) : (
        <TimeGrid
          days={days}
          occurrences={occurrences}
          onEventClick={openOccurrence}
          today={today}
          timeZone={timeZone}
        />
      )}

      <EventDetailsModal
        occurrence={detailsOccurrence}
        onClose={() => setDetailsOccurrence(null)}
        canManage={
          !!detailsOccurrence && canManageOccurrence(detailsOccurrence)
        }
        onEdit={openEditForm}
        onDelete={handleDelete}
        deleting={deleting}
      />

      <EventFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        event={formTarget}
        initialDate={anchor}
        onSubmit={handleSubmit}
        saving={saving}
        error={formError}
      />
    </Card>
  );
}
