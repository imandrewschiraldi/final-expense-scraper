"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bot, Mic, Moon, Send, Sun, X } from "lucide-react";
import { NotificationBell } from "@/components/agent/NotificationBell";
import { HEADER_HEIGHT } from "@/components/portal/Sidebar";
import { ProfileMenu } from "@/components/portal/ProfileMenu";
import { QuickLinksMenu } from "@/components/portal/QuickLinksMenu";
import { useTheme } from "@/lib/useTheme";

type Role = "ADMIN" | "MANAGER" | "AGENT";
type Profile = { name: string; profileImageUrl: string | null };

type Source = { uri: string; title: string };
type ChatTurn = { role: "user" | "model"; text: string; sources?: Source[] };

// Minimal ambient typing for the Web Speech API's SpeechRecognition — not
// reliably present across TS's DOM lib versions, and the webkit-prefixed
// constructor (the only one Chrome/Edge actually expose) isn't typed at
// all. Only the handful of members "talk to type" below actually uses.
type SpeechRecognitionResultLike = { 0: { transcript: string } };
type SpeechRecognitionEventLike = { results: ArrayLike<SpeechRecognitionResultLike> };
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
 *
 * Draggable by its Bot icon (press and hold, then move) so it can be pulled
 * off to the side whenever it sits over a page's own title/heading/logo —
 * `position: fixed` once moved, so it's pinned to the viewport rather than
 * scrolling away, and clamped so it can never be dragged fully off-screen.
 * Intentionally NOT persisted — this is in-memory React state, so a page
 * refresh always puts it back at its default top-left header spot, same as
 * the conversation itself resetting.
 *
 * The open chat panel is also resizable from its bottom-right corner (plain
 * CSS `resize`, not custom drag logic) — `min-width`/`min-height` are
 * pinned to its own default `w-96`/`max-h-[480px]` size, so it can only be
 * dragged bigger, never smaller than what you'd see without touching it.
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

function AiSearchBox() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const followUpRef = useRef<HTMLTextAreaElement>(null);
  const dragRef = useRef<{ offsetX: number; offsetY: number; moved: boolean } | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  // What was already typed when dictation started — spoken words are
  // appended after it rather than overwriting it.
  const listenBaseRef = useRef("");
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        body: JSON.stringify({ question: trimmed, history }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Something went wrong.");
      } else {
        setMessages((m) => [...m, { role: "model", text: data.answer, sources: data.sources }]);
      }
    } catch {
      setError("Couldn't reach the AI assistant.");
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
      for (let i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript;
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
    setOpen(true);
    setListening(true);
    // Armed immediately too, in case nothing is ever said at all — covers
    // both "clicked mic and stayed silent" and the gap before the first
    // word lands.
    armSilenceTimer(listenBaseRef.current);
  }

  function clamp(next: { x: number; y: number }) {
    const margin = 8;
    const w = containerRef.current?.offsetWidth ?? 290;
    const h = containerRef.current?.offsetHeight ?? 40;
    return {
      x: Math.min(Math.max(next.x, margin), window.innerWidth - w - margin),
      y: Math.min(Math.max(next.y, margin), window.innerHeight - h - margin),
    };
  }

  function onDragHandlePointerDown(e: React.PointerEvent) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = { offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onDragHandlePointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    drag.moved = true;
    setPos(clamp({ x: e.clientX - drag.offsetX, y: e.clientY - drag.offsetY }));
  }

  function onDragHandlePointerUp(e: React.PointerEvent) {
    dragRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }

  // Clicking outside just collapses the panel back into the trigger pill —
  // it does NOT clear the conversation. An accidental click-off used to
  // wipe the whole thread; now the thread survives, and clicking the pill
  // again reopens it exactly where it was left off. Clearing is explicit:
  // the X at the top of the open panel, or the pill's own X once collapsed.
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

  // Keeps the newest message in view as the thread grows, same as any chat
  // window — otherwise a long carrier-by-carrier answer scrolls the reply
  // out of sight above the fold.
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages, loading]);

  // Grows the follow-up textarea to fit what's typed (up to a cap, then it
  // scrolls internally) — a plain single-line input scrolls text sideways
  // out of view once it's wider than the box; wrapping onto new lines
  // instead means everything typed stays visible.
  useEffect(() => {
    const el = followUpRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, FOLLOWUP_MAX_HEIGHT)}px`;
  }, [question]);

  // Takes any SyntheticEvent (a real form submit, or a keydown for
  // Enter-to-send on the follow-up textarea) rather than specifically
  // FormEvent, since both need the same preventDefault/stop-dictation/
  // submit sequence.
  async function ask(e?: React.SyntheticEvent) {
    e?.preventDefault();
    recognitionRef.current?.stop();
    clearSilenceTimer();
    await submitQuestion(question);
  }

  const hasThread = messages.length > 0;

  const dragHandle = (
    <span
      onPointerDown={onDragHandlePointerDown}
      onPointerMove={onDragHandlePointerMove}
      onPointerUp={onDragHandlePointerUp}
      onPointerCancel={onDragHandlePointerUp}
      onClick={(e) => e.stopPropagation()}
      title="Drag to move"
      className="absolute top-1/2 left-1.5 z-10 flex h-6 w-6 -translate-y-1/2 cursor-grab touch-none items-center justify-center text-muted active:cursor-grabbing"
    >
      <Bot className="pointer-events-none h-4 w-4" />
    </span>
  );

  // Mic ("talk to type" — only where the browser actually implements
  // SpeechRecognition, feature-detected above; appends to whatever's
  // already typed rather than replacing it) and Send share one small
  // rounded-icon-button treatment in a single flex group, instead of each
  // being its own independently-offset absolute element — reads as one
  // cohesive control built into the pill rather than two floating icons
  // guessed into alignment. Enter still submits too; Send is just a
  // visible click target, same as this platform's own chat input.
  //
  // `align="bottom"` for the follow-up textarea, which grows taller as you
  // type — vertically centering the icons there would leave them stranded
  // in the middle of a multi-line box, so they pin to the bottom-right
  // (where the cursor/send action naturally is) instead, same as any
  // auto-growing chat composer.
  function micSendGroup(align: "center" | "bottom" = "center") {
    return (
      <div
        className={`absolute right-1.5 flex items-center gap-0.5 ${
          align === "bottom" ? "bottom-1.5" : "top-1/2 -translate-y-1/2"
        }`}
      >
        {speechSupported && (
          <button
            type="button"
            onClick={toggleListening}
            aria-label={listening ? "Stop dictation" : "Dictate with your microphone"}
            title={listening ? "Stop dictation" : "Dictate with your microphone"}
            className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
              listening ? "bg-red-light/15 text-red-light" : "text-muted hover:bg-surface2 hover:text-foreground"
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
    );
  }

  return (
    <div
      ref={containerRef}
      className={pos ? "fixed z-[999] w-[290px]" : "relative w-full max-w-[290px]"}
      style={pos ? { left: pos.x, top: pos.y } : undefined}
    >
      {/* Before a conversation starts, the header pill itself is the input.
          Once there's a thread, it becomes a non-editable trigger — typing
          happens in the chat panel's own input, docked at the bottom of the
          thread like any chat window, not back up here. */}
      {!hasThread ? (
        <form onSubmit={ask}>
          {dragHandle}
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder="Ask Gemini — insurance, underwriting..."
            className={`w-full rounded-lg border border-border bg-input-bg py-2 pl-9 text-sm text-foreground placeholder:text-muted focus:border-copper-dim-gradient focus:outline-none ${speechSupported ? "pr-16" : "pr-9"}`}
          />
          {micSendGroup("center")}
        </form>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setOpen(true);
          }}
          className="flex w-full cursor-pointer items-center gap-2 rounded-lg border border-border bg-input-bg py-2 pr-3 pl-9 text-left text-sm text-muted hover:text-foreground"
        >
          {dragHandle}
          <span className="truncate">Gemini conversation — click to continue</span>
        </div>
      )}
      {open && (loading || hasThread || error) && (
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
            <span className="font-condensed text-[10px] font-bold tracking-[0.1em] text-muted uppercase">Gemini conversation</span>
            <button type="button" onClick={reset} aria-label="Clear conversation" className="text-muted hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
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
                {/* Only present when this turn actually triggered a live
                    Google Search (most don't) — same grounding behavior as
                    the Gemini app, surfaced as plain source links rather
                    than inline citation markers. */}
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                    {m.sources.map((s, si) => (
                      <a
                        key={si}
                        href={s.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="max-w-[200px] truncate text-[11px] text-teal-light hover:underline"
                        title={s.title}
                      >
                        {s.title}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && <p className={`text-muted ${hasThread ? "mt-3" : ""}`}>Thinking…</p>}
            {error && <p className={`text-red-light ${hasThread ? "mt-3" : ""}`}>{error}</p>}
            <div ref={threadEndRef} />
          </div>
          {/* The follow-up input, fixed at the bottom of the conversation —
              keep asking without losing the thread above it. A growing
              textarea (not a single-line input) so typed text wraps onto a
              new line and stays visible instead of scrolling sideways out
              of view once it's wider than the box; Enter sends, Shift+Enter
              inserts an actual newline. */}
          <form onSubmit={ask} className="shrink-0 border-t border-border p-2">
            <div className="relative">
              <textarea
                ref={followUpRef}
                rows={1}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void ask(e);
                  }
                }}
                placeholder="Ask a follow-up..."
                autoFocus
                disabled={loading}
                style={{ maxHeight: FOLLOWUP_MAX_HEIGHT }}
                className={`w-full resize-none overflow-y-auto rounded-lg border border-border bg-input-bg py-2 pl-3 text-sm text-foreground placeholder:text-muted focus:border-copper-dim-gradient focus:outline-none disabled:opacity-60 ${speechSupported ? "pr-16" : "pr-9"}`}
              />
              {micSendGroup("bottom")}
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
 * Omitted entirely on Scripts — the embedded tool there draws its own
 * Notifications-equivalent control (and a busy New Call header of its own)
 * in its own header, so our outer copy would render right on top of it.
 * Commission Calculator's own header has no such controls (just a centered
 * title, see its light-mode build), so it keeps the icon cluster — just
 * without the search box, which isn't part of this request and would sit
 * awkwardly with nothing to its left.
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

  if (pathname.startsWith("/scripts")) return null;
  const iconsOnly = pathname.startsWith("/commission-calculator");

  const iconCluster = (
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
  );

  return (
    <>
      {/* Desktop: search box (left) and utility icon cluster (right) are
          two independently-anchored containers, not two flex children of
          one "justify-between" row — the search box can go position:fixed
          once dragged (removing it from flow entirely), and a flex row with
          only one remaining child collapses "space-between" to flex-start,
          which was yanking the icon cluster over to the left, right where
          the search box used to sit, the moment it was dragged away. Each
          one keeping its own fixed anchor means the icon cluster never
          moves, no matter what the search box is doing. Commission
          Calculator just skips the search box entirely — nothing to its
          left there. */}
      {!iconsOnly && (
        <div
          className="absolute top-0 left-4 z-40 hidden items-center sm:left-6 lg:left-10 lg:flex"
          style={{ height: HEADER_HEIGHT }}
        >
          <AiSearchBox />
        </div>
      )}
      <div
        className="absolute top-0 right-4 z-40 hidden items-center sm:right-6 lg:right-10 lg:flex"
        style={{ height: HEADER_HEIGHT }}
      >
        {iconCluster}
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
