"use client";

import { Link as LinkIcon, MapPin, Phone, Pencil, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { PIPELINE_STAGE_COLOR_CLASSES } from "@/lib/pipelineStageColors";
import {
  RECURRENCE_RULE_LABELS,
  formatEventRange,
  type CalendarOccurrence,
} from "@/lib/calendarRecurrence";

/** Read-only view of one occurrence — opened by clicking an event pill/block
 *  in either the month grid or the week/day time grid. Editing or deleting
 *  always acts on the whole series, not just this occurrence — there's no
 *  per-occurrence override in this schema. `canManage` is true for an admin
 *  looking at an agency-wide event, or anyone looking at their own personal
 *  one — never another agent's personal event, and never an agency event
 *  for a non-admin. */
export function EventDetailsModal({
  occurrence,
  onClose,
  canManage,
  onEdit,
  onDelete,
  deleting,
  timeZone,
}: {
  occurrence: CalendarOccurrence | null;
  onClose: () => void;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
  timeZone?: string;
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
            <span
              className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${PIPELINE_STAGE_COLOR_CLASSES[occurrence.color as keyof typeof PIPELINE_STAGE_COLOR_CLASSES]?.dot ?? PIPELINE_STAGE_COLOR_CLASSES.copper.dot}`}
            />
            <div>
              <p>
                {occurrence.occurrenceStart.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <p className="text-muted">
                {occurrence.allDay
                  ? "All day"
                  : formatEventRange(
                      occurrence.occurrenceStart,
                      occurrence.occurrenceEnd,
                      timeZone,
                    )}
                {occurrence.recurrenceRule &&
                  ` · ${RECURRENCE_RULE_LABELS[occurrence.recurrenceRule]}`}
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
            {canManage && (
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
