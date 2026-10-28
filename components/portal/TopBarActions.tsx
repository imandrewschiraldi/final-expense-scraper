"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bot, Moon, Sun, X } from "lucide-react";
import { NotificationBell } from "@/components/agent/NotificationBell";
import { HEADER_HEIGHT } from "@/components/portal/Sidebar";
import { NO_OUTER_LINE_PREFIXES } from "@/components/portal/HeaderDivider";
import { ProfileMenu } from "@/components/portal/ProfileMenu";
import { QuickLinksMenu } from "@/components/portal/QuickLinksMenu";
import { useTheme } from "@/lib/useTheme";

type Role = "ADMIN" | "MANAGER" | "AGENT";
type Profile = { name: string; profileImageUrl: string | null };

type ChatTurn = { role: "user" | "model"; text: string };

/**
 * The header's search box — not a platform search (that's the sidebar's
 * own search, which filters the nav), this asks Gemini general insurance/
 * underwriting questions as an open conversation: a follow-up question
 * reuses the thread above it instead of starting over. Server-side key,
 * scoped system prompt, and the "not your actual lead data" disclaimer all
 * live in the API route, not here.
 *
 * The thread is intentionally NOT kept once you step away from it — closing
 * it (clicking outside, or the clear button) wipes the conversation, so
 * reopening the box always starts a fresh search instead of resurfacing a
 * stale answer from an unrelated question asked earlier.
 */
function AiSearchBox() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);

  function reset() {
    setOpen(false);
    setMessages([]);
    setError(null);
    setQuestion("");
  }

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        reset();
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  // Keeps the newest message in view as the thread grows, same as any chat
  // window — otherwise a long carrier-by-carrier answer scrolls the reply
  // out of sight above the fold.
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages, loading]);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || loading) return;
    const history = messages;
    setMessages((m) => [...m, { role: "user", text: trimmed }]);
    setQuestion("");
    setLoading(true);
    setError(null);
    setOpen(true);
    try {
      const res = await fetch("/api/portal/ask-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, history }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Something went wrong.");
      } else {
        setMessages((m) => [...m, { role: "model", text: data.answer }]);
      }
    } catch {
      setError("Couldn't reach the AI assistant.");
    } finally {
      setLoading(false);
    }
  }

  const hasThread = messages.length > 0;

  return (
    <div ref={containerRef} className="relative w-full max-w-[290px]">
      {/* Before a conversation starts, the header pill itself is the input.
          Once there's a thread, it becomes a non-editable trigger — typing
          happens in the chat panel's own input, docked at the bottom of the
          thread like any chat window, not back up here. */}
      {!hasThread ? (
        <form onSubmit={ask}>
          <Bot className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder="Ask Gemini — insurance, underwriting..."
            className="w-full rounded-lg border border-border bg-input-bg py-2 pr-3 pl-9 text-sm text-foreground placeholder:text-muted focus:border-copper-dim-gradient focus:outline-none"
          />
        </form>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setOpen(true);
          }}
          className="flex w-full cursor-pointer items-center gap-2 rounded-lg border border-border bg-input-bg py-2 pr-8 pl-9 text-left text-sm text-muted hover:text-foreground"
        >
          <Bot className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
          <span className="truncate">Gemini conversation — click to continue</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              reset();
            }}
            aria-label="Clear conversation"
            className="absolute top-1/2 right-2 -translate-y-1/2 text-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {open && (loading || hasThread || error) && (
        <div className="absolute top-full left-0 z-20 mt-2 flex max-h-[480px] w-96 flex-col overflow-hidden rounded-[10px] border border-border bg-surface shadow-lg">
          <div className="min-h-0 flex-1 overflow-y-auto p-3 text-sm">
            {messages.map((m, i) => (
              <div key={i} className={i > 0 ? "mt-3" : ""}>
                <p
                  className={`mb-1 font-condensed text-[10px] font-bold tracking-[0.1em] uppercase ${
                    m.role === "user" ? "text-muted" : "metal-copper-text"
                  }`}
                >
                  {m.role === "user" ? "You" : "Gemini"}
                </p>
                <p className="whitespace-pre-wrap text-foreground">{m.text}</p>
              </div>
            ))}
            {loading && <p className={`text-muted ${hasThread ? "mt-3" : ""}`}>Thinking…</p>}
            {error && <p className={`text-red-light ${hasThread ? "mt-3" : ""}`}>{error}</p>}
            <div ref={threadEndRef} />
          </div>
          {/* The follow-up input, fixed at the bottom of the conversation —
              keep asking without losing the thread above it. */}
          <form onSubmit={ask} className="shrink-0 border-t border-border p-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a follow-up..."
              autoFocus
              disabled={loading}
              className="w-full rounded-lg border border-border bg-input-bg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-copper-dim-gradient focus:outline-none disabled:opacity-60"
            />
          </form>
        </div>
      )}
    </div>
  );
}

/**
 * Notifications — pulled out of the sidebar footer and into the top-right
 * corner of every page instead, above the copper accent line (HeaderDivider
 * sits at HEADER_HEIGHT). The avatar here is the same ProfileMenu the
 * sidebar footer uses (Profile/Sound/Tour/Log Out), just opening downward
 * instead of upward — no separate Settings icon, since that was just a
 * second link to the same /profile page the menu's own "Profile" item
 * already covers.
 *
 * The search box + avatar are lg+ only: below that, PageHeader already
 * fills this same row with the mobile hamburger + logo, so only the bell
 * (the original, unchanged mobile behavior) renders there.
 *
 * `left-4/right-4 sm:left-6/right-6 lg:left-10/right-10` deliberately
 * mirrors main's own padding — an absolutely positioned child's inset is
 * relative to main's padding-box edge, which ignores that padding entirely
 * (see HeaderDivider's own note on this), so it has to be replicated here to
 * land in the same place normal content's edges do.
 *
 * Omitted on Scripts/Commission Calculator — same reasoning as
 * HeaderDivider's own copper line there: the embedded tool on those pages
 * draws its own Notifications-equivalent control in its own header, and our
 * outer copy would render right on top of it.
 */
export function TopBarActions({ role, name }: { role: Role; name: string }) {
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [theme, setTheme] = useTheme();

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data?.profile && setProfile(data.profile));
  }, []);

  if (NO_OUTER_LINE_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  return (
    <>
      {/* Desktop: search (left) + utility icons (right), same row the
          copper accent line sits just below. */}
      <div
        className="absolute top-0 left-4 right-4 z-40 hidden items-center justify-between gap-3 sm:left-6 sm:right-6 lg:left-10 lg:right-10 lg:flex"
        style={{ height: HEADER_HEIGHT }}
      >
        <AiSearchBox />
        <div className="flex items-center gap-3">
          <QuickLinksMenu />
          <button
            type="button"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            className="flex h-9 w-9 shrink-0 items-center justify-center text-muted transition-colors hover:text-foreground"
          >
            {/* Shows the icon for what clicking it switches TO, not the
                current theme — dark mode shows the sun (tap for light),
                light mode shows the moon (tap for dark). */}
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </button>
          <NotificationBell />
          <ProfileMenu profile={profile} name={name} role={role} collapsed showTour={role !== "ADMIN"} menuAlign="down" />
        </div>
      </div>

      {/* Mobile/tablet: unchanged from before — just the bell, same spot. */}
      <div
        className="absolute top-0 right-4 z-40 flex items-center gap-2 sm:right-6 lg:hidden"
        style={{ height: HEADER_HEIGHT }}
      >
        <NotificationBell />
      </div>
    </>
  );
}
