import { CalendarWidget } from "@/components/portal/overview/CalendarWidget";

export const dynamic = "force-dynamic";

// No graphic wordmark asset exists for this slug (see PageHeading's
// HEADINGS map) — the widget's own "Calendar" card title stands in for a
// page heading here, same as Overview/Dashboard do for their own panels.
export default function CalendarPage() {
  return (
    <div className="pt-10 lg:pt-24">
      <CalendarWidget />
    </div>
  );
}
