"use client";

import { useEffect, useRef, useState } from "react";
import { Landmark, Send } from "lucide-react";

// Locked to the button's own natural rendered width (measured, not a
// guess) so swapping its content for an input never changes its footprint
// — the whole point being this never grows, shrinks, or changes color the
// way the header's "Ask Gemini" box (and this component's own earlier
// versions) did.
const BUBBLE_WIDTH = "w-[232px]";

/**
 * A pill button (matching People Search/KPI Tracker/etc. here on
 * Overview) that turns into a text input in place when clicked — same
 * outer size the whole time, no modal, no resizing, no background color
 * change. The answer (when there is one) appears in a small panel below,
 * which doesn't affect the bubble's own size either.
 */
export function RoutingNumberButton() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function close() {
    setOpen(false);
    setQuery("");
    setAnswer(null);
    setError(null);
  }

  useEffect(() => {
    if (open) inputRef.current?.focus();
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

  return (
    <div ref={containerRef} className={`relative ${BUBBLE_WIDTH} shrink-0`}>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="font-condensed flex w-full items-center justify-center gap-2 rounded-full border border-border px-4 py-2 text-[13px] font-bold tracking-[0.08em] text-foreground uppercase transition-colors hover:border-copper-dim-gradient hover:text-white"
        >
          <Landmark className="h-4 w-4" />
          Routing Number Genie
        </button>
      ) : (
        <form onSubmit={ask} className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Bank + city/ZIP"
            className="w-full rounded-full border border-border bg-transparent py-2 pr-8 pl-4 text-[13px] text-foreground placeholder:text-muted focus:border-copper-dim-gradient focus:outline-none"
          />
          <button
            type="submit"
            disabled={!query.trim() || loading}
            aria-label="Search"
            title="Search"
            className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted transition-colors hover:text-foreground disabled:opacity-40 disabled:hover:text-muted"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      )}
      {(loading || answer || error) && (
        <div className="border-copper-dim-gradient absolute top-full left-0 z-20 mt-2 w-72 rounded-[10px] bg-surface p-3 text-sm shadow-lg">
          {loading && <p className="text-muted">Looking it up…</p>}
          {error && <p className="text-red-light">{error}</p>}
          {answer && (
            <p className="whitespace-pre-wrap text-foreground">{answer}</p>
          )}
        </div>
      )}
    </div>
  );
}
