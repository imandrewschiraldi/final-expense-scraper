import { ProfilePanel } from "@/components/portal/ProfilePanel";
import { PushNotificationSettings } from "@/components/portal/PushNotificationSettings";

export default function ProfilePage() {
  return (
    <div>
      <div className="space-y-6 pt-10">
        <ProfilePanel />
        <PushNotificationSettings />
      </div>
    </div>
  );
}
