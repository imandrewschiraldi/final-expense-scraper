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

type View = "month" | "week" | "day";

function parseEvent(raw: {
  id: string;
  title: string;
  description: string | null;
  link: string | null;
  phoneNumber: string | null;
  location: string | null;
  startAt: string;
  endAt: string;
  recurring: boolean;
  recurrenceEndAt: string | null;
}): CalendarEventRecord {
  return {
    ...raw,
    startAt: new Date(raw.startAt),
    endAt: new Date(raw.endAt),
    recurrenceEndAt: raw.recurrenceEndAt ? new Date(raw.recurrenceEndAt) : null,
  };
}

/** Full-width card under the Overview page's top three (Hall of Fame, Bonus,
 *  Goals) — visible to everyone, admin-editable. Modeled on Google
 *  Calendar's own month/week/day views: month defaults, click through to
 *  week or day for the full time-grid, built for an admin posting the
 *  agency's 10-15 weekly trainings once (as repeating events) rather than
 *  re-adding them every week. */
export function CalendarWidget() {
  const { data: session } = useSession();
  const isAdmin = session?.user.role === "ADMIN";

  const [events, setEvents] = useState<CalendarEventRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("month");
  const [anchor, setAnchor] = useState(() => new Date());

  const [detailsOccurrence, setDetailsOccurrence] =
    useState<CalendarOccurrence | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formTarget, setFormTarget] = useState<CalendarEventRecord | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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
  }, []);

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
    () => (events ? expandOccurrences(events, range.start, range.end) : []),
    [events, range],
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

  function openCreateForm() {
    setFormTarget(null);
    setFormError(null);
    setFormOpen(true);
  }

  function openEditForm() {
    if (!detailsOccurrence) return;
    setFormTarget(detailsOccurrence);
    setDetailsOccurrence(null);
    setFormError(null);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!detailsOccurrence) return;
    if (
      !window.confirm(
        `Delete "${detailsOccurrence.title}"? This removes every upcoming occurrence.`,
      )
    ) {
      return;
    }
    setDeleting(true);
    const res = await fetch(
      `/api/admin/calendar-events/${detailsOccurrence.id}`,
      {
        method: "DELETE",
      },
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
    const url = formTarget
      ? `/api/admin/calendar-events/${formTarget.id}`
      : "/api/admin/calendar-events";
    const res = await fetch(url, {
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
          <CardTitle className="text-[15.5px]">Training Calendar</CardTitle>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <Button type="button" onClick={openCreateForm}>
              <Plus className="h-3.5 w-3.5" />
              Add Event
            </Button>
          )}
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
              onClick={() => setAnchor(new Date())}
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
        />
      ) : (
        <TimeGrid
          days={days}
          occurrences={occurrences}
          onEventClick={openOccurrence}
        />
      )}

      <EventDetailsModal
        occurrence={detailsOccurrence}
        onClose={() => setDetailsOccurrence(null)}
        isAdmin={!!isAdmin}
        onEdit={openEditForm}
        onDelete={handleDelete}
        deleting={deleting}
      />

      {isAdmin && (
        <EventFormModal
          open={formOpen}
          onClose={() => setFormOpen(false)}
          event={formTarget}
          initialDate={anchor}
          onSubmit={handleSubmit}
          saving={saving}
          error={formError}
        />
      )}
    </Card>
  );
}
