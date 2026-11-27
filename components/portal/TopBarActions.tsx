"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bot, Mic, Send, X } from "lucide-react";
import { NotificationBell } from "@/components/agent/NotificationBell";
import { HEADER_HEIGHT } from "@/components/portal/Sidebar";
import { ProfileMenu } from "@/components/portal/ProfileMenu";
import { QuickLinksMenu } from "@/components/portal/QuickLinksMenu";
import { ThemeMenu } from "@/components/portal/ThemeMenu";

type Role = "ADMIN" | "MANAGER" | "AGENT";
type Profile = { name: string; profileImageUrl: string | null };

type Source = { uri: string; title: string };
type ChatTurn = { role: "user" | "model"; text: string; sources?: Source[] };

// Minimal ambient typing for the Web Speech API's SpeechRecognition — not
// reliably present across TS's DOM lib versions, and the webkit-prefixed
// constructor (the only one Chrome/Edge actually expose) isn't typed at
// all. Only the handful of members "talk to type" below actually uses.
type SpeechRecognitionResultLike = { 0: { transcript: string } };
type SpeechRecognitionEventLike = {
  results: ArrayLike<SpeechRecognitionResultLike>;
};
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}
type SpeechRecognitionWindow = typeof window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

/**
 * Ask A.T.L.A.S. — a global assistant drawer, opened from a small floating
 * trigger pill or Cmd/Ctrl+K from anywhere in the app (the shortcut used to
 * focus the sidebar's own nav search instead — see Sidebar.tsx — A.T.L.A.S.
 * owns it now, and the nav search is still reachable by just clicking it).
 * Not a platform search; this asks Gemini as an open conversation, with a
 * follow-up reusing the thread above it instead of starting over. Scope is
 * broad (not just insurance/underwriting — general work topics too, live-
 * searched), with one narrow exception: a specific person's carrier
 * eligibility routes to the agency's own underwriting guide instead.
 * Server-side key and the actual system prompt live in the API route, not
 * here — including which function-calling tools Gemini can reach for
 * (CRM search, underwriting cross-reference, live web lookup).
 *
 * A small, fixed-position pill (not a wide text input sitting in the
 * header's own flow) is what lets this render on every page, every role,
 * with nothing to collide with — the previous inline search box had to be
 * hidden entirely on several admin/agent pages whose own plain-text
 * headings shared its exact screen position.
 *
 * The thread is intentionally NOT kept once you step away from it — closing
 * it (clicking outside, or the clear button) wipes the conversation, so
 * reopening the panel always starts a fresh search instead of resurfacing a
 * stale answer from an unrelated question asked earlier.
 *
 * The open panel is also resizable from its bottom-right corner (plain CSS
 * `resize`, not custom drag logic) — `min-width`/`min-height` are pinned to
 * its own default `w-96`/`max-h-[480px]` size, so it can only be dragged
 * bigger, never smaller than what you'd see without touching it.
 */
const CHAT_PANEL_MIN_WIDTH = 384; // matches the default w-96
const CHAT_PANEL_MIN_HEIGHT = 480; // matches the default max-h-[480px]
// How long dictation can go quiet before it's treated as "done talking" and
// auto-sent — reset on every new word, not just a one-shot timer from when
// listening started.
const SILENCE_AUTO_SEND_MS = 4000;
// Follow-up textarea grows with content (so typed text always wraps onto a
// new line instead of scrolling sideways out of view) up to this height,
// then scrolls internally rather than eating the whole panel.
const FOLLOWUP_MAX_HEIGHT = 160;

// Derives the "Context: John Smith" badge (and the matching line folded
// into the prompt server-side) from the current URL alone — no page-level
// context provider needed. Covers the one case that's both common and
// cheap to resolve from a URL: a lead's own detail page, via the same
// GET-by-id route My Leads/Vault detail pages already use (which already
// authorizes a vault lead the viewer has access to, not just their own).
function useAtlasContext() {
  const pathname = usePathname();
  const [label, setLabel] = useState<string | null>(null);
  const [line, setLine] = useState<string | null>(null);

  useEffect(() => {
    const match = pathname.match(/^\/agent\/(?:leads|vault)\/([^/?]+)/);
    if (!match) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLabel(null);
      setLine(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/agent/leads/${match[1]}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.lead) return;
        const name = `${data.lead.firstName} ${data.lead.lastName}`.trim();
        setLabel(name);
        setLine(
          `The agent asking is currently viewing this lead's detail page: ${name} (lead id ${match[1]}).`,
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return { pathname, label, line };
}

function AtlasAssistant() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  // What was already typed when dictation started — spoken words are
  // appended after it rather than overwriting it.
  const listenBaseRef = useRef("");
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const atlasContext = useAtlasContext();

  function clearSilenceTimer() {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }

  function reset() {
    recognitionRef.current?.stop();
    clearSilenceTimer();
    setOpen(false);
    setMessages([]);
    setError(null);
    setQuestion("");
  }

  function openPanel() {
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  // Global Cmd/Ctrl+K opens (or focuses, if already open) this panel from
  // anywhere in the app — takes over the shortcut the sidebar's own nav
  // search used to own.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openPanel();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Shared by the form's Enter/Send submit and dictation's own auto-send —
  // takes the text explicitly rather than reading `question` state, since
  // the auto-send path calls this from inside a setTimeout where state
  // read via closure could theoretically be stale.
  async function submitQuestion(text: string) {
    const trimmed = text.trim();
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
        body: JSON.stringify({
          question: trimmed,
          history,
          context: { pathname: atlasContext.pathname, line: atlasContext.line },
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Something went wrong.");
      } else {
        setMessages((m) => [
          ...m,
          { role: "model", text: data.answer, sources: data.sources },
        ]);
      }
    } catch {
      setError("Couldn't reach A.T.L.A.S.");
    } finally {
      setLoading(false);
    }
  }

  // Feature-detected client-side only — not every browser (Firefox desktop,
  // notably) implements SpeechRecognition at all, so the mic button simply
  // doesn't render there instead of showing something that does nothing.
  useEffect(() => {
    const w = window as SpeechRecognitionWindow;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSpeechSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
    return () => {
      recognitionRef.current?.stop();
      clearSilenceTimer();
    };
  }, []);

  function toggleListening() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const w = window as SpeechRecognitionWindow;
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    listenBaseRef.current = question;

    // Restarted on every result, not just armed once — 4 straight seconds
    // without any new speech (not 4 seconds total) is what counts as "done
    // talking". Takes the text explicitly so it sends exactly what was
    // heard as of the last word, not whatever `question` reads as by the
    // time the timeout actually fires.
    function armSilenceTimer(textSoFar: string) {
      clearSilenceTimer();
      silenceTimerRef.current = setTimeout(() => {
        recognitionRef.current?.stop();
        if (textSoFar.trim()) void submitQuestion(textSoFar);
      }, SILENCE_AUTO_SEND_MS);
    }

    recognition.onresult = (e) => {
      let transcript = "";
      for (let i = 0; i < e.results.length; i++)
        transcript += e.results[i][0].transcript;
      const base = listenBaseRef.current;
      const combined = (base ? `${base} ${transcript}` : transcript).trim();
      setQuestion(combined);
      armSilenceTimer(combined);
    };
    // Covers both an explicit stop() and the browser's own silence timeout
    // ending it on its own — either way the mic button needs to stop
    // showing "listening", and any pending auto-send timer needs to stop
    // with it (ask() already submits on its own, and a stale timer firing
    // afterward would just no-op against an already-cleared question).
    recognition.onend = () => {
      setListening(false);
      clearSilenceTimer();
    };
    recognition.onerror = () => {
      setListening(false);
      clearSilenceTimer();
    };
    recognitionRef.current = recognition;
    recognition.start();
    openPanel();
    setListening(true);
    // Armed immediately too, in case nothing is ever said at all — covers
    // both "clicked mic and stayed silent" and the gap before the first
    // word lands.
    armSilenceTimer(listenBaseRef.current);
  }

  // Clicking outside just collapses the panel back into the trigger pill —
  // it does NOT clear the conversation. An accidental click-off used to
  // wipe the whole thread; now the thread survives, and clicking the pill
  // again reopens it exactly where it was left off. Clearing is explicit:
  // the X at the top of the open panel, or the pill's own X once collapsed.
  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
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

  // Grows the input to fit what's typed (up to a cap, then it scrolls
  // internally) — a plain single-line input scrolls text sideways out of
  // view once it's wider than the box; wrapping onto new lines instead
  // means everything typed stays visible.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, FOLLOWUP_MAX_HEIGHT)}px`;
  }, [question]);

  // Takes any SyntheticEvent (a real form submit, or a keydown for
  // Enter-to-send) rather than specifically FormEvent, since both need the
  // same preventDefault/stop-dictation/submit sequence.
  async function ask(e?: React.SyntheticEvent) {
    e?.preventDefault();
    recognitionRef.current?.stop();
    clearSilenceTimer();
    await submitQuestion(question);
  }

  const hasThread = messages.length > 0;

  return (
    <div ref={containerRef} data-tour="ask-gemini-box" className="relative">
      {/* Closed state: a small fixed-size trigger pill, never a wide text
          input sitting in the header's own flow — this is what lets
          A.T.L.A.S. render on every page/role without colliding with any
          page's own heading. */}
      <button
        type="button"
        onClick={openPanel}
        aria-label="Ask A.T.L.A.S."
        title="Ask A.T.L.A.S. (⌘K)"
        className="flex items-center gap-1.5 rounded-full border border-border bg-input-bg px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-copper-dim-gradient hover:text-foreground"
      >
        <Bot className="h-3.5 w-3.5" />
        <span>Ask A.T.L.A.S.</span>
        <span className="hidden text-[10px] text-muted/70 sm:inline">⌘K</span>
      </button>

      {open && (
        <div
          className="resize absolute top-full left-0 z-20 mt-2 flex w-96 flex-col overflow-hidden rounded-[10px] border border-border bg-surface shadow-lg"
          style={{
            minWidth: CHAT_PANEL_MIN_WIDTH,
            minHeight: CHAT_PANEL_MIN_HEIGHT,
            maxWidth: "min(900px, 90vw)",
            maxHeight: "80vh",
          }}
        >
          {/* Explicit clear, separate from closing the panel — click-outside
              (or the drag handle collapsing it back into the pill) only
              hides this panel now, it doesn't wipe the thread. This is the
              one deliberate way to clear it all at once. */}
          <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-1.5">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="font-condensed shrink-0 text-[10px] font-bold tracking-[0.1em] text-muted uppercase">
                A.T.L.A.S.
              </span>
              {atlasContext.label && (
                <span className="metal-copper-text truncate text-[10px] font-bold">
                  Context: {atlasContext.label}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={reset}
              aria-label="Clear conversation"
              className="shrink-0 text-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3 text-sm">
            {!hasThread && !loading && !error && (
              <p className="text-muted">
                Ask about a lead, a carrier&apos;s underwriting rules, or
                anything else — press ⌘K to come back here from any page.
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={i > 0 ? "mt-3" : ""}>
                <p
                  className={`mb-1 font-condensed text-[10px] font-bold tracking-[0.1em] uppercase ${
                    m.role === "user" ? "text-muted" : "metal-copper-text"
                  }`}
                >
                  {m.role === "user" ? "You" : "A.T.L.A.S."}
                </p>
                <p className="whitespace-pre-wrap text-foreground">{m.text}</p>
              </div>
            ))}
            {loading && (
              <p className={`text-muted ${hasThread ? "mt-3" : ""}`}>
                Thinking…
              </p>
            )}
            {error && (
              <p className={`text-red-light ${hasThread ? "mt-3" : ""}`}>
                {error}
              </p>
            )}
            <div ref={threadEndRef} />
          </div>
          {/* The input, fixed at the bottom of the conversation — a growing
              textarea (not a single-line input) so typed text wraps onto a
              new line and stays visible instead of scrolling sideways out
              of view once it's wider than the box; Enter sends, Shift+Enter
              inserts an actual newline. */}
          <form onSubmit={ask} className="shrink-0 border-t border-border p-2">
            <div className="relative">
              <textarea
                ref={inputRef}
                rows={1}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void ask(e);
                  }
                }}
                placeholder={hasThread ? "Ask a follow-up..." : "Ask A.T.L.A.S..."}
                autoFocus
                disabled={loading}
                style={{ maxHeight: FOLLOWUP_MAX_HEIGHT }}
                className={`w-full resize-none overflow-y-auto rounded-lg border border-border bg-input-bg py-2 pl-3 text-sm text-foreground placeholder:text-muted focus:border-copper-dim-gradient focus:outline-none disabled:opacity-60 ${speechSupported ? "pr-16" : "pr-9"}`}
              />
              <div className="absolute right-1.5 bottom-1.5 flex items-center gap-0.5">
                {speechSupported && (
                  <button
                    type="button"
                    onClick={toggleListening}
                    aria-label={
                      listening ? "Stop dictation" : "Dictate with your microphone"
                    }
                    title={
                      listening ? "Stop dictation" : "Dictate with your microphone"
                    }
                    className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
                      listening
                        ? "bg-red-light/15 text-red-light"
                        : "text-muted hover:bg-surface2 hover:text-foreground"
                    }`}
                  >
                    <Mic className={`h-4 w-4 ${listening ? "animate-pulse" : ""}`} />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!question.trim() || loading}
                  aria-label="Send"
                  title="Send"
                  className="flex h-6 w-6 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface2 hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
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
 * Omitted entirely on both Scripts and Commission Calculator — each
 * embedded tool's own content scrolls away beneath this outer row (see
 * EmbeddedTool.tsx), so a persistent icon cluster floating on top of it
 * would never scroll away with it, just sit stranded over whatever
 * happened to scroll underneath. "Open in New Tab" lives inside each
 * tool's own header instead, for the same reason — it needs to scroll
 * away with that header, not hover above it.
 */
export function TopBarActions({
  role,
  name,
  initialProfile,
}: {
  role: Role;
  name: string;
  // Seeded server-side (see app/(portal)/layout.tsx and friends, which
  // already fetch this same name/profileImageUrl pair for Sidebar) instead
  // of starting null and waiting on this component's own client-side fetch
  // below — without it, every cross-layout-group navigation (Portal <->
  // Admin <-> Agent are separate layout.tsx files, each mounting a fresh
  // AppShell/TopBarActions) remounted this with profile null again, so the
  // real picture briefly reverted to ProfileMenu's plain-initial fallback
  // before this fetch resolved a beat later. The fetch still runs after
  // mount too, to pick up a picture changed elsewhere in the same session.
  initialProfile?: Profile | null;
}) {
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(
    initialProfile ?? null,
  );

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data?.profile && setProfile(data.profile));
  }, []);

  if (pathname.startsWith("/scripts") || pathname.startsWith("/commission-calculator")) return null;
  // The Vault's own header already has its own PREV/NEXT lead navigation
  // and a bell/avatar-free layout by design — the profile picture,
  // notifications, theme toggle, and quick links would just be clutter
  // competing with it, so this is the one page that hides the whole icon
  // cluster (A.T.L.A.S.'s own small pill stays — it no longer competes for
  // the same space a wide search input used to).
  const isVault =
    pathname.startsWith("/agent/vault") ||
    pathname.startsWith("/admin/leads/vault");

  const iconCluster = (
    <div className="flex items-center gap-3">
      <QuickLinksMenu />
      <ThemeMenu />
      <NotificationBell />
      <ProfileMenu
        profile={profile}
        name={name}
        role={role}
        collapsed
        showTour={role !== "ADMIN"}
        menuAlign="down"
      />
    </div>
  );

  return (
    <>
      {/* Desktop: A.T.L.A.S.'s pill (left) and utility icon cluster (right)
          are two independently-anchored containers, not two flex children
          of one "justify-between" row — each keeps its own fixed anchor so
          neither depends on the other being present. Now shown for every
          role and every page (the small pill never collides with a page's
          own heading the way the old wide search input sometimes did). */}
      <div
        className="absolute top-0 left-4 z-40 hidden items-center sm:left-6 lg:left-10 lg:flex"
        style={{ height: HEADER_HEIGHT }}
      >
        <AtlasAssistant />
      </div>
      {!isVault && (
        <div
          className="absolute top-0 right-4 z-40 hidden items-center sm:right-6 lg:right-10 lg:flex"
          style={{ height: HEADER_HEIGHT }}
        >
          {iconCluster}
        </div>
      )}

      {/* Mobile/tablet: unchanged from before — just the bell, same spot. */}
      {!isVault && (
        <div
          className="absolute top-0 right-4 z-40 flex items-center gap-2 sm:right-6 lg:hidden"
          style={{ height: HEADER_HEIGHT }}
        >
          <NotificationBell />
        </div>
      )}
    </>
  );
}
