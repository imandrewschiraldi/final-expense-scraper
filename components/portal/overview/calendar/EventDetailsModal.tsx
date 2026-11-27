"use client";

import {
  Calendar,
  Link as LinkIcon,
  MapPin,
  Phone,
  Pencil,
  Trash2,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  formatEventRange,
  type CalendarOccurrence,
} from "@/lib/calendarRecurrence";

/** Read-only view of one occurrence — opened by clicking an event pill/block
 *  in either the month grid or the week/day time grid. Editing or deleting
 *  (admin only) always acts on the whole series, not just this occurrence —
 *  there's no per-occurrence override in this schema, matching the simple
 *  "repeats every week" recurrence this calendar supports. */
export function EventDetailsModal({
  occurrence,
  onClose,
  isAdmin,
  onEdit,
  onDelete,
  deleting,
}: {
  occurrence: CalendarOccurrence | null;
  onClose: () => void;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <Modal
      open={!!occurrence}
      onClose={onClose}
      title={occurrence?.title ?? "Event"}
      maxWidthClassName="max-w-md"
    >
      {occurrence && (
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 text-sm text-foreground">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
            <div>
              <p>
                {occurrence.occurrenceStart.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <p className="text-muted">
                {formatEventRange(
                  occurrence.occurrenceStart,
                  occurrence.occurrenceEnd,
                )}
                {occurrence.recurring && " · Repeats weekly"}
              </p>
            </div>
          </div>

          {occurrence.location && (
            <div className="flex items-center gap-2.5 text-sm text-foreground">
              <MapPin className="h-4 w-4 shrink-0 text-muted" />
              <span>{occurrence.location}</span>
            </div>
          )}

          {occurrence.phoneNumber && (
            <div className="flex items-center gap-2.5 text-sm text-foreground">
              <Phone className="h-4 w-4 shrink-0 text-muted" />
              <a
                href={`tel:${occurrence.phoneNumber}`}
                className="hover:underline"
              >
                {occurrence.phoneNumber}
              </a>
            </div>
          )}

          {occurrence.link && (
            <div className="flex items-center gap-2.5 text-sm">
              <LinkIcon className="h-4 w-4 shrink-0 text-muted" />
              <a
                href={occurrence.link}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-teal-light hover:underline"
              >
                {occurrence.link}
              </a>
            </div>
          )}

          {occurrence.description && (
            <p className="border-t border-border pt-3 text-sm whitespace-pre-wrap text-foreground">
              {occurrence.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
            {occurrence.link && (
              <Button
                variant="primary"
                onClick={() =>
                  window.open(occurrence.link!, "_blank", "noopener,noreferrer")
                }
              >
                Join
              </Button>
            )}
            {isAdmin && (
              <>
                <Button variant="ghost" onClick={onEdit}>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button variant="danger" onClick={onDelete} disabled={deleting}>
                  <Trash2 className="h-3.5 w-3.5" />
                  {deleting ? "Deleting..." : "Delete"}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
