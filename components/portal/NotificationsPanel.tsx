"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { notificationMessage, type NotificationRecord } from "@/lib/notifications";

export function NotificationsPanel() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/notifications?limit=20");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setNextCursor(data.nextCursor);
        if (data.notifications.some((n: NotificationRecord) => !n.read)) {
          await fetch("/api/notifications", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: "{}",
          });
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    const res = await fetch(`/api/notifications?limit=20&cursor=${nextCursor}`);
    if (res.ok) {
      const data = await res.json();
      setNotifications((prev) => [...prev, ...data.notifications]);
      setNextCursor(data.nextCursor);
    }
    setLoadingMore(false);
  }

  if (loading) {
    return <p className="text-sm text-muted">Loading...</p>;
  }

  return (
    <Card>
      {notifications.length === 0 ? (
        <p className="text-sm text-muted">No notifications yet.</p>
      ) : (
        <div className="divide-y divide-border">
          {notifications.map((n) => (
            <div key={n.id} className={cn("flex items-center justify-between gap-4 py-3", !n.read && "bg-teal/5")}>
              <p className="text-sm text-white">{notificationMessage(n)}</p>
              <p className="shrink-0 text-xs text-muted">
                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
              </p>
            </div>
          ))}
        </div>
      )}
      {nextCursor && (
        <Button variant="ghost" className="mt-4" onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? "Loading..." : "Load More"}
        </Button>
      )}
    </Card>
  );
}
