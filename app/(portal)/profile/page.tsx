import { ProfilePanel } from "@/components/portal/ProfilePanel";
import { PushNotificationSettings } from "@/components/portal/PushNotificationSettings";

export default function ProfilePage() {
  return (
    <div>
      <h1 className="mb-10 text-2xl font-extrabold tracking-wide text-white uppercase">My Profile</h1>
      <div className="space-y-6">
        <ProfilePanel />
        <PushNotificationSettings />
      </div>
    </div>
  );
}
