import { ProfilePanel } from "@/components/portal/ProfilePanel";
import { PushNotificationSettings } from "@/components/portal/PushNotificationSettings";

export default function ProfilePage() {
  return (
    <div>
      {/* lg:pt-24 (not just pt-10) because the desktop top bar's Ask Gemini
          box and icon cluster are position:absolute over this page's top
          74px (see Sidebar.tsx's HEADER_HEIGHT) — nothing reserves that
          band for them on desktop, so unlike PageHeading's own centered
          wordmark (safely clear of both edges by design), this page's
          left-aligned heading needs real vertical clearance. 96px is the
          value actually measured (via getBoundingClientRect, not just a
          screenshot) to clear both elements during the KPI Tracker page's
          same fix. */}
      <div className="space-y-6 pt-10 lg:pt-24">
        <ProfilePanel />
        <PushNotificationSettings />
      </div>
    </div>
  );
}
