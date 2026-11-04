"use client";

import { useState } from "react";
import { Rss, Copy, Check } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type Bridge = {
  mode: "WEBHOOK" | "POLL";
  webhookUrl: string;
  groupMeGroupId: string | null;
  hasAccessToken: boolean;
  lastMessageAt: string | null;
  createdAt: string;
};

type GroupOption = { id: string; name: string };

/**
 * Admin-only, one-way GroupMe bridge for a single channel — connect a
 * GroupMe group so its messages land here automatically. Nothing posted in
 * this app is ever sent back to GroupMe.
 *
 * Two connection modes, since not every admin can create a GroupMe bot
 * (dev.groupme.com/bots/new — needs someone with rights on the group, and
 * GroupMe only allows one registered callback URL per group regardless of
 * who created it):
 *  - WEBHOOK: GroupMe pushes messages to app/api/webhooks/groupme in real
 *    time. Needs bot-creation rights on the GroupMe group.
 *  - POLL: this app pulls messages using an ordinary member's own personal
 *    GroupMe access token (lib/groupmePoll.ts), piggybacking on this
 *    channel's normal chat poll cadence. Needs only group membership.
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

  // Not-connected-yet state
  const [connectMode, setConnectMode] = useState<"WEBHOOK" | "POLL">("POLL");
  const [tokenInput, setTokenInput] = useState("");
  const [groups, setGroups] = useState<GroupOption[] | null>(null);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState("");

  function resetConnectForm() {
    setConnectMode("POLL");
    setTokenInput("");
    setGroups(null);
    setGroupsLoading(false);
    setSelectedGroupId("");
  }

  async function openModal() {
    setOpen(true);
    setLoading(true);
    setError(null);
    resetConnectForm();
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

  async function findGroups() {
    if (!tokenInput.trim()) return;
    setGroupsLoading(true);
    setError(null);
    setGroups(null);
    try {
      const res = await fetch("/api/admin/chat/groupme-bridge/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: tokenInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load groups.");
      setGroups(data.groups);
      if (data.groups.length > 0) setSelectedGroupId(data.groups[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load groups.");
    } finally {
      setGroupsLoading(false);
    }
  }

  async function connectWebhook() {
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

  async function connectPoll() {
    if (!tokenInput.trim() || !selectedGroupId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/chat/groupme-bridge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: channel.id,
          mode: "POLL",
          accessToken: tokenInput.trim(),
          groupMeGroupId: selectedGroupId,
        }),
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
      resetConnectForm();
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

  const tabClass = (active: boolean) =>
    cn(
      "font-condensed flex-1 rounded-md px-3 py-1.5 text-xs font-bold tracking-[0.08em] uppercase transition-colors",
      active ? "toggle-pill-active" : "btn-metal-copper",
    );

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
                Connected
                {bridge.mode === "POLL" ? " (via a personal access token)" : ""}
                . Messages posted in the linked GroupMe group show up in{" "}
                <span className="font-bold metal-copper-text">
                  #{channel.name}
                </span>{" "}
                automatically — nothing from here is ever sent back to GroupMe.
              </p>

              {bridge.mode === "WEBHOOK" ? (
                <>
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
                      Paste this URL into the GroupMe bot&apos;s Callback URL
                      field at{" "}
                      <a
                        href="https://dev.groupme.com/bots/new"
                        target="_blank"
                        rel="noreferrer"
                        className="underline hover:text-foreground"
                      >
                        dev.groupme.com/bots/new
                      </a>
                      , pick the group it should relay from, and create the bot.
                      No messages have arrived yet.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted">
                  {bridge.lastMessageAt
                    ? `Last message received ${new Date(bridge.lastMessageAt).toLocaleString()}.`
                    : "Checking for new messages each time this channel is open. None have arrived yet."}
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

              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setConnectMode("POLL")}
                  className={tabClass(connectMode === "POLL")}
                >
                  My own account
                </button>
                <button
                  type="button"
                  onClick={() => setConnectMode("WEBHOOK")}
                  className={tabClass(connectMode === "WEBHOOK")}
                >
                  Create a bot
                </button>
              </div>

              {connectMode === "POLL" ? (
                <div className="space-y-3">
                  <p className="text-xs text-muted">
                    Works with just your own GroupMe membership in that group —
                    no bot, no admin access needed. Find your personal access
                    token by logging into{" "}
                    <a
                      href="https://dev.groupme.com"
                      target="_blank"
                      rel="noreferrer"
                      className="underline hover:text-foreground"
                    >
                      dev.groupme.com
                    </a>{" "}
                    and opening your account menu.
                  </p>
                  <div>
                    <label className="font-condensed mb-1.5 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
                      Access token
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={tokenInput}
                        onChange={(e) => {
                          setTokenInput(e.target.value);
                          setGroups(null);
                        }}
                        placeholder="Paste your GroupMe access token"
                        className="w-full min-w-0 rounded-lg border-copper-focus-gradient bg-surface2 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={findGroups}
                        disabled={!tokenInput.trim() || groupsLoading}
                        className="shrink-0"
                      >
                        {groupsLoading ? "Finding..." : "Find groups"}
                      </Button>
                    </div>
                  </div>

                  {groups && (
                    <div>
                      <label className="font-condensed mb-1.5 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
                        Group
                      </label>
                      {groups.length === 0 ? (
                        <p className="text-sm text-muted">
                          That token isn&apos;t in any groups.
                        </p>
                      ) : (
                        <select
                          value={selectedGroupId}
                          onChange={(e) => setSelectedGroupId(e.target.value)}
                          className="w-full rounded-lg border-copper-focus-gradient bg-surface2 px-3 py-2 text-sm text-foreground focus:outline-none"
                        >
                          {groups.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  {error && <p className="text-sm text-red-light">{error}</p>}
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="primary"
                      onClick={connectPoll}
                      disabled={busy || !groups?.length || !selectedGroupId}
                    >
                      {busy ? "Connecting..." : "Connect GroupMe"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-muted">
                    Needs rights to create a bot on the GroupMe group — GroupMe
                    shows a webhook URL to paste in after you click Connect
                    below.
                  </p>
                  {error && <p className="text-sm text-red-light">{error}</p>}
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="primary"
                      onClick={connectWebhook}
                      disabled={busy}
                    >
                      {busy ? "Connecting..." : "Connect GroupMe"}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
