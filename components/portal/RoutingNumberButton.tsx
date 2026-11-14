"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Landmark, Send, X } from "lucide-react";

// The agency's own Custom GPT, tuned specifically for this lookup — not
// callable from here (no API for a ChatGPT-builder GPT, and it's gated to
// whoever's signed into chatgpt.com with access to it), so it's offered as
// a direct link alongside the built-in answer rather than embedded.
const CUSTOM_GPT_URL =
  "https://chatgpt.com/g/g-68e875684a288191b309977ba96716f3-routing-number-genie";

/**
 * Same interaction shape as the header's "Ask Gemini" box — a single free
 * text input, type and hit send, answer appears below — but triggered from
 * a pill button (matching People Search/KPI Tracker/etc. here on Overview)
 * instead of always being visible, since this is a narrow one-off lookup
 * rather than something agents reach for constantly.
 *
 * One-shot, not a conversation: submitting again just replaces the answer
 * below instead of threading a follow-up, since "what's the routing number
 * for X" has no natural follow-up question the way an open Q&A box does.
 */
export function RoutingNumberButton() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        close();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function close() {
    setOpen(false);
    setQuery("");
    setAnswer(null);
    setError(null);
  }

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() || loading) return;
    setLoading(true);
    setAnswer(null);
    setError(null);
    try {
      const res = await fetch("/api/portal/routing-number", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.answer) {
        setAnswer(data.answer);
      } else {
        setError(data.error ?? "Couldn't look that up. Try again.");
      }
    } catch {
      setError("Couldn't reach the AI assistant. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-condensed inline-flex shrink-0 items-center gap-2 rounded-full border border-border px-4 py-2 text-[13px] font-bold tracking-[0.08em] text-foreground uppercase transition-colors hover:border-copper-dim-gradient hover:text-white"
      >
        <Landmark className="h-4 w-4" />
        Routing Number Genie
      </button>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-[290px]">
      <form onSubmit={ask}>
        <Landmark className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Bank name + city or ZIP..."
          className="w-full rounded-full border border-border bg-input-bg py-2 pr-16 pl-9 text-sm text-foreground placeholder:text-muted focus:border-copper-dim-gradient focus:outline-none"
        />
        <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1">
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            title="Close"
            className="flex h-6 w-6 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface2 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
          <button
            type="submit"
            disabled={!query.trim() || loading}
            aria-label="Search"
            title="Search"
            className="flex h-6 w-6 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface2 hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
      <a
        href={CUSTOM_GPT_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted hover:text-foreground hover:underline"
      >
        <ExternalLink className="h-3 w-3" />
        Or open the Routing Number Genie GPT directly
      </a>
      {(loading || answer || error) && (
        <div className="absolute top-full left-0 z-20 mt-2 w-full min-w-[320px] rounded-[10px] border border-border bg-surface p-3 text-sm shadow-lg">
          {loading && <p className="text-muted">Looking it up…</p>}
          {error && <p className="text-red-light">{error}</p>}
          {answer && (
            <>
              <p className="whitespace-pre-wrap text-foreground">{answer}</p>
              <p className="mt-2 text-xs text-muted">
                AI-generated from a live search — verify directly with the bank
                before using this for a payment or draft.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
