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
        className="font-condensed relative rounded-lg border-[1.5px] border-copper-dim px-4 py-2 text-[13px] font-bold tracking-[0.05em] text-muted uppercase transition-colors hover:border-copper hover:text-foreground"
      >
        Notifications
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-xs font-bold text-black">
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
