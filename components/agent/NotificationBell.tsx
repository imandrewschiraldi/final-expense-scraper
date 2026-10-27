"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/cn";
import { notificationMessage, type NotificationRecord } from "@/lib/notifications";

type Notification = NotificationRecord;

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Closes on an outside click, same as the sidebar's profile menu —
  // otherwise the only way out was clicking the bell again.
  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

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

  async function clearAll() {
    if (!window.confirm("Clear all notifications? This can't be undone.")) return;
    await fetch("/api/notifications", { method: "DELETE" });
    setNotifications([]);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        data-tour="notification-bell"
        onClick={handleOpen}
        aria-label="Notifications"
        title="Notifications"
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-[1.5px] border-copper-hover-gradient text-muted transition-colors hover:text-foreground"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4.5 w-4.5 shrink-0">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {unreadCount > 0 && (
          <span className="metal-copper-surface absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-black">
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute top-full right-0 z-10 mt-2 max-h-96 w-72 overflow-y-auto rounded-[10px] border border-border bg-surface p-2 shadow-lg">
          {notifications.length === 0 && <p className="p-2 text-sm text-muted">No notifications yet.</p>}
          {notifications.map((n) => (
            <div
              key={n.id}
              className={cn("rounded-lg p-2 text-sm", !n.read && "bg-teal/10")}
            >
              <p className="text-white">{notificationMessage(n)}</p>
              <p className="text-xs text-muted">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</p>
            </div>
          ))}
          <div className="mt-1 flex items-center gap-1">
            <Link
              href="/portal/notifications"
              className="font-condensed metal-copper-text block flex-1 rounded-lg p-2 text-center text-xs font-bold tracking-[0.05em] uppercase hover:bg-copper-gradient-10"
            >
              View All
            </Link>
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="font-condensed block flex-1 rounded-lg p-2 text-center text-xs font-bold tracking-[0.05em] text-muted uppercase hover:bg-red/10 hover:text-red-light"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
