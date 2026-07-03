"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/cn";

type Notification = {
  id: string;
  type: string;
  payload: { count?: number };
  read: boolean;
  createdAt: string;
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
      }
    }

    const interval = setInterval(() => {
      load();
    }, 30000);
    load();
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function handleOpen() {
    setOpen((o) => !o);
    if (unreadCount > 0) {
      await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: "{}" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        aria-label="Notifications"
        className="font-condensed relative flex items-center gap-2 rounded-lg border-[1.5px] border-copper-dim px-3 py-2 text-[13px] font-bold tracking-[0.05em] text-muted uppercase transition-colors hover:border-copper hover:text-foreground sm:px-4"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4.5 w-4.5 shrink-0">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="hidden sm:inline">Notifications</span>
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-copper text-xs font-bold text-black">
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-2 w-72 rounded-[10px] border border-border bg-surface p-2 shadow-lg">
          {notifications.length === 0 && <p className="p-2 text-sm text-muted">No notifications yet.</p>}
          {notifications.map((n) => (
            <div
              key={n.id}
              className={cn("rounded-lg p-2 text-sm", !n.read && "bg-teal/10")}
            >
              <p className="text-white">
                {n.payload?.count ?? ""} new lead{n.payload?.count === 1 ? "" : "s"} assigned to you
              </p>
              <p className="text-xs text-muted">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
