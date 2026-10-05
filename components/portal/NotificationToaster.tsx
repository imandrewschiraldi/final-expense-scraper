"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { notificationMessage, type NotificationRecord } from "@/lib/notifications";

type Toast = { id: string; message: string; href: string };

const POLL_MS = 15000;
const DISMISS_MS = 7000;

/**
 * A lightweight in-app banner for new notifications/chat messages while the
 * portal is open in a tab — the "app is open" half of push notifications
 * (the other half, real OS-level push for when the app is closed, is a
 * separate, heavier piece of infra).
 *
 * Polls the same endpoints NotificationBell and the chat rail already use,
 * diffing against what's been seen since mount so it only toasts for
 * genuinely new arrivals, never the full backlog on first load.
 */
export function NotificationToaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seenNotifIds = useRef<Set<string> | null>(null);
  const lastChatUnread = useRef<number | null>(null);

  useEffect(() => {
    function pushToast(toast: Toast) {
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, DISMISS_MS);
    }

    async function pollNotifications() {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      const list: NotificationRecord[] = data.notifications ?? [];
      if (seenNotifIds.current === null) {
        seenNotifIds.current = new Set(list.map((n) => n.id));
        return;
      }
      for (const n of list) {
        if (!seenNotifIds.current.has(n.id)) {
          seenNotifIds.current.add(n.id);
          pushToast({ id: `notif-${n.id}`, message: notificationMessage(n), href: "/portal/notifications" });
        }
      }
    }

    async function pollChat() {
      const res = await fetch("/api/portal/chat/channels");
      if (!res.ok) return;
      const data = await res.json();
      const channels: { unreadCount: number }[] = data.channels ?? [];
      const total = channels.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);
      if (lastChatUnread.current === null) {
        lastChatUnread.current = total;
        return;
      }
      if (total > lastChatUnread.current) {
        const delta = total - lastChatUnread.current;
        pushToast({
          id: `chat-${Date.now()}`,
          message: `${delta} new message${delta === 1 ? "" : "s"} in Team Chat`,
          href: "/portal/chat",
        });
      }
      lastChatUnread.current = total;
    }

    pollNotifications();
    pollChat();
    const interval = setInterval(() => {
      pollNotifications();
      pollChat();
    }, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed top-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto relative overflow-hidden rounded-[10px] border border-border bg-surface p-3 pr-8 shadow-lg"
        >
          <span className="metal-copper-surface absolute inset-y-0 left-0 w-1" />
          <Link href={t.href} className="block pl-2 text-sm text-white hover:underline">
            {t.message}
          </Link>
          <button
            type="button"
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            aria-label="Dismiss"
            className="absolute top-2 right-2 text-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
