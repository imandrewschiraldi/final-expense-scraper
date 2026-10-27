import { NotificationsPanel } from "@/components/portal/NotificationsPanel";
import { PageHeading } from "@/components/portal/PageHeading";

export default function NotificationsPage() {
  return (
    <div>
      <PageHeading slug="notifications" alt="Notifications" />
      <NotificationsPanel />
    </div>
  );
}
