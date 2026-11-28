import { CalendarWidget } from "@/components/portal/overview/CalendarWidget";
import { PageHeading } from "@/components/portal/PageHeading";

export const dynamic = "force-dynamic";

export default function CalendarPage() {
  return (
    <div>
      <PageHeading slug="calendar" alt="Calendar" />
      <CalendarWidget />
    </div>
  );
}
