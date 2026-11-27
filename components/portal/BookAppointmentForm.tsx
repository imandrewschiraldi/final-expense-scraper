"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

function toDateInputValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function toTimeInputValue(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function defaultStart(): Date {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

/** Shown in place of a plain stage change when a Lead is moved to the
 *  Appointment Booked stage — the date/time this collects is what actually
 *  lands on the booking agent's own calendar (see BookOfBusinessPanel's
 *  bookAppointment and /api/agent/leads/[id]/appointment). */
export function BookAppointmentForm({
  contactName,
  onCancel,
  onBook,
  saving,
  error,
}: {
  contactName: string;
  onCancel: () => void;
  onBook: (startAt: string, endAt: string) => void;
  saving: boolean;
  error: string | null;
}) {
  const [date, setDate] = useState(() => toDateInputValue(defaultStart()));
  const [startTime, setStartTime] = useState(() =>
    toTimeInputValue(defaultStart()),
  );
  const [endTime, setEndTime] = useState(() => {
    const end = defaultStart();
    end.setHours(end.getHours() + 1);
    return toTimeInputValue(end);
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !startTime || !endTime) return;
    onBook(
      new Date(`${date}T${startTime}`).toISOString(),
      new Date(`${date}T${endTime}`).toISOString(),
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-muted">
        Pick a date and time for the appointment with {contactName} — this adds
        it to your calendar.
      </p>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
            Date
          </label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
            Start
          </label>
          <Input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
            End
          </label>
          <Input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
        </div>
      </div>
      {error && <p className="text-sm text-red-light">{error}</p>}
      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Booking..." : "Book Appointment"}
        </Button>
      </div>
    </form>
  );
}
