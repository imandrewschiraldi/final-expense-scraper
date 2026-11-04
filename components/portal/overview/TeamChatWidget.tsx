"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { WidgetAvatar } from "@/components/portal/overview/WidgetAvatar";

type Message = {
  id: string;
  body: string;
  authorName: string;
  authorProfileImageUrl: string | null;
  createdAt: string;
  channelName: string;
  channelSlug: string;
};

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.floor(hr / 24)}d`;
}

export function TeamChatWidget({ messages }: { messages: Message[] }) {
  return (
    <Card className="flex h-full flex-col p-5">
      <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <MessageCircle
            className="h-[18px] w-[18px]"
            style={{ color: "var(--copper-metal-hi)" }}
          />
          <h3 className="font-condensed text-[15.5px] font-extrabold tracking-wide text-white uppercase">
            Team Chat
          </h3>
        </div>
        <Link
          // `messages` is already newest-first (see overview/route.ts), so
          // the first entry's channel is wherever the latest activity
          // actually is — Daily Sales, Underwriting Help, OME GroupMe,
          // whichever one most recently had something posted.
          href={
            messages[0] ? `/chat?channel=${messages[0].channelSlug}` : "/chat"
          }
          className="font-condensed text-[11px] font-bold tracking-wide text-teal-light uppercase hover:underline"
        >
          View All
        </Link>
      </div>

      {messages.length === 0 ? (
        <p className="text-sm text-muted">No recent messages.</p>
      ) : (
        <div className="flex flex-col gap-3.5">
          {messages.map((m) => (
            <div key={m.id} className="flex items-start gap-2.5">
              <WidgetAvatar
                url={m.authorProfileImageUrl}
                name={m.authorName}
                sizeClassName="h-[30px] w-[30px] text-[11.5px]"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-1.5">
                  <span className="text-[13.5px] font-semibold text-foreground">
                    {m.authorName}
                  </span>
                  <span className="font-condensed text-[10.5px] font-bold tracking-wide text-muted uppercase">
                    #{m.channelName}
                  </span>
                  <span className="ml-auto text-[11px] text-muted">
                    {timeAgo(m.createdAt)}
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-1 text-[13px] text-muted">
                  {m.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
