"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";

/** Web Push wants the VAPID key as a raw Uint8Array, not the base64url
 *  string it's issued/stored as. */
function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

type Status = "checking" | "unsupported" | "denied" | "off" | "on";

export function PushNotificationSettings() {
  const [status, setStatus] = useState<Status>("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    async function check() {
      if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setStatus(sub ? "on" : "off");
    }
    check();
  }, []);

  async function enable() {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      setError("Push isn't configured yet.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      const json = sub.toJSON();
      const res = await fetch("/api/portal/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      if (!res.ok) {
        await sub.unsubscribe().catch(() => {});
        setError("Couldn't save this device's subscription. Try again in a bit.");
        setStatus("off");
        return;
      }
      setStatus("on");
    } catch {
      setError("Couldn't enable push notifications on this device.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/portal/push", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus("off");
    } catch {
      setError("Couldn't disable push notifications.");
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    setError(null);
    setTestSent(false);
    try {
      const res = await fetch("/api/portal/notifications/test", { method: "POST" });
      if (!res.ok) throw new Error();
      setTestSent(true);
    } catch {
      setError("Couldn't send the test notification.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "unsupported") return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Push Notifications</CardTitle>
      </CardHeader>
      {status === "denied" ? (
        <p className="text-sm text-muted">
          Notifications are blocked for this site in your browser settings. Enable them there to turn this on.
        </p>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted">
            Get an alert on this device for new leads, goals hit, and team chat messages — even when the app isn&apos;t
            open. On iPhone, add this app to your Home Screen first (Share → Add to Home Screen), then turn this on
            from there.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant={status === "on" ? "ghost" : "primary"}
              onClick={status === "on" ? disable : enable}
              disabled={busy || status === "checking"}
            >
              {status === "on" ? <BellOff className="size-4" /> : <Bell className="size-4" />}
              {status === "on" ? "Disable on This Device" : "Enable on This Device"}
            </Button>
            <Button variant="ghost" onClick={sendTest} disabled={busy || status === "checking"}>
              Send Test Notification
            </Button>
          </div>
          {testSent && (
            <p className="mt-3 text-sm text-teal-light">
              Sent — check for an in-app banner now, and a push alert on this device if it&apos;s enabled above.
            </p>
          )}
        </>
      )}
      {error && <p className="mt-3 text-sm text-red-light">{error}</p>}
    </Card>
  );
}
