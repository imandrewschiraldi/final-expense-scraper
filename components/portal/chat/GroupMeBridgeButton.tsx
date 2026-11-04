"use client";

import { useState } from "react";
import { Rss, Copy, Check } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

type Bridge = {
  webhookUrl: string;
  groupMeGroupId: string | null;
  lastMessageAt: string | null;
  createdAt: string;
};

/**
 * Admin-only, one-way GroupMe bridge for a single channel — connect a
 * GroupMe group so its messages land here automatically. Nothing posted in
 * this app is ever sent back to GroupMe; see app/api/webhooks/groupme.
 */
export function GroupMeBridgeButton({
  channel,
}: {
  channel: { id: string; name: string };
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bridge, setBridge] = useState<Bridge | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  async function openModal() {
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/chat/groupme-bridge?channelId=${channel.id}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load.");
      setBridge(data.bridge);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }

  async function connect() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/chat/groupme-bridge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: channel.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to connect.");
      setBridge(data.bridge);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect.");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/chat/groupme-bridge?channelId=${channel.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to disconnect.");
      }
      setBridge(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!bridge) return;
    await navigator.clipboard.writeText(bridge.webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          openModal();
        }}
        aria-label={`Connect GroupMe to ${channel.name}`}
        title="Connect GroupMe"
        className="text-xs text-muted hover:text-foreground"
      >
        <Rss className="h-3.5 w-3.5" />
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Connect GroupMe"
        maxWidthClassName="max-w-md"
      >
        <div className="space-y-4 p-5">
          {loading ? (
            <p className="text-sm text-muted">Loading...</p>
          ) : bridge ? (
            <>
              <p className="text-sm text-foreground">
                Connected. Messages posted in the linked GroupMe group show up
                in{" "}
                <span className="font-bold metal-copper-text">
                  #{channel.name}
                </span>{" "}
                automatically — nothing from here is ever sent back to GroupMe.
              </p>
              <div>
                <label className="font-condensed mb-1.5 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
                  Webhook URL
                </label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={bridge.webhookUrl}
                    onFocus={(e) => e.target.select()}
                    className="w-full min-w-0 rounded-lg border border-border bg-surface2 px-3 py-2 text-xs text-foreground"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={copy}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              {bridge.lastMessageAt ? (
                <p className="text-xs text-muted">
                  Last message received{" "}
                  {new Date(bridge.lastMessageAt).toLocaleString()}.
                </p>
              ) : (
                <p className="text-xs text-muted">
                  Paste this URL into the GroupMe bot&apos;s Callback URL field
                  at{" "}
                  <a
                    href="https://dev.groupme.com/bots/new"
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:text-foreground"
                  >
                    dev.groupme.com/bots/new
                  </a>
                  , pick the group it should relay from, and create the bot. No
                  messages have arrived yet.
                </p>
              )}
              {error && <p className="text-sm text-red-light">{error}</p>}
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="danger"
                  onClick={disconnect}
                  disabled={busy}
                >
                  {busy ? "Disconnecting..." : "Disconnect"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-foreground">
                Connect a GroupMe group so its messages show up in{" "}
                <span className="font-bold metal-copper-text">
                  #{channel.name}
                </span>{" "}
                automatically. This is one-way — nothing posted here is ever
                sent to GroupMe.
              </p>
              {error && <p className="text-sm text-red-light">{error}</p>}
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="primary"
                  onClick={connect}
                  disabled={busy}
                >
                  {busy ? "Connecting..." : "Connect GroupMe"}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
