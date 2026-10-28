"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bot, Moon, Sun } from "lucide-react";
import { NotificationBell } from "@/components/agent/NotificationBell";
import { HEADER_HEIGHT } from "@/components/portal/Sidebar";
import { NO_OUTER_LINE_PREFIXES } from "@/components/portal/HeaderDivider";
import { ProfileMenu } from "@/components/portal/ProfileMenu";
import { useTheme } from "@/lib/useTheme";

type Role = "ADMIN" | "MANAGER" | "AGENT";
type Profile = { name: string; profileImageUrl: string | null };

/**
 * The header's search box — not a platform search (that's the sidebar's
 * own search, which filters the nav), this asks Gemini general insurance/
 * underwriting questions and shows the answer in a dropdown underneath.
 * Server-side key, scoped system prompt, and the "not your actual lead
 * data" disclaimer all live in the API route, not here.
 */
function AiSearchBox() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    setAnswer(null);
    setOpen(true);
    try {
      const res = await fetch("/api/portal/ask-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Something went wrong.");
      } else {
        setAnswer(data.answer);
      }
    } catch {
      setError("Couldn't reach the AI assistant.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-[240px]">
      <form onSubmit={ask}>
        <Bot className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onFocus={() => (answer || error) && setOpen(true)}
          placeholder="Ask Gemini — insurance, underwriting..."
          className="w-full rounded-lg border border-border bg-surface py-2 pr-3 pl-9 text-sm text-foreground placeholder:text-muted focus:border-copper-dim-gradient focus:outline-none"
        />
      </form>
      {open && (loading || answer || error) && (
        <div className="absolute top-full left-0 z-20 mt-2 w-80 rounded-[10px] border border-border bg-surface p-3 text-sm shadow-lg">
          {loading && <p className="text-muted">Thinking…</p>}
          {error && <p className="text-red-light">{error}</p>}
          {answer && <p className="whitespace-pre-wrap text-foreground">{answer}</p>}
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
          <button
            type="button"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            className="text-muted transition-colors hover:text-foreground"
          >
            {theme === "light" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
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
