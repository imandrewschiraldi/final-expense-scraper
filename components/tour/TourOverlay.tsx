"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, List, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { visibleSections, type Role, type TourStep } from "@/lib/tour/steps";
import { useTour } from "@/components/tour/TourProvider";

const PAD = 8;
const PANEL_WIDTH = 340;
const SEARCH_TIMEOUT_MS = 6000;
const SEARCH_INTERVAL_MS = 250;

function isElementVisible(el: Element): boolean {
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden" || parseFloat(style.opacity || "1") === 0) {
    return false;
  }
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return false;
  // Only checked horizontally: this is here to exclude the closed mobile
  // nav drawer (translated off-screen to the left, not display:none), not
  // to exclude ordinary page content that's simply below the fold — that's
  // normal and gets scrolled into view once it's the chosen match.
  if (rect.right < 0 || rect.left > window.innerWidth) return false;
  return true;
}

function findVisible(selector: string): Element | null {
  const all = document.querySelectorAll(selector);
  for (const el of all) {
    if (isElementVisible(el)) return el;
  }
  return null;
}

/** Finds the step's target once (retrying until it appears or the search times out), then tracks
 *  its bounding box every frame so the highlight follows scrolling, resizing, or layout shifts. */
function useTourTarget(step: TourStep | null) {
  const [el, setEl] = useState<Element | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setEl(null);
    setRect(null);
    setNotFound(false);
    if (!step?.selector) return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = Math.ceil(SEARCH_TIMEOUT_MS / SEARCH_INTERVAL_MS);

    function tryFind() {
      if (cancelled) return;
      const found = step!.selector ? findVisible(step!.selector) : null;
      if (found) {
        found.scrollIntoView({ block: "center", behavior: "smooth" });
        setEl(found);
        setRect(found.getBoundingClientRect());
        return;
      }
      attempts += 1;
      if (attempts >= maxAttempts) {
        setNotFound(true);
        return;
      }
      setTimeout(tryFind, SEARCH_INTERVAL_MS);
    }
    tryFind();
    return () => {
      cancelled = true;
    };
  }, [step]);

  useEffect(() => {
    if (!el) return;
    let raf = 0;
    function track() {
      setRect(el!.getBoundingClientRect());
      raf = requestAnimationFrame(track);
    }
    raf = requestAnimationFrame(track);
    return () => cancelAnimationFrame(raf);
  }, [el]);

  return { rect, notFound };
}

/** The real sidebar's right edge (0 on mobile, where it's an overlay
 *  drawer rather than taking up layout width) — tracked continuously so
 *  the docked panel slides along with its collapse/expand animation
 *  instead of sitting on top of the nav links it's meant to explain. */
function useSidebarRight(): number {
  const [right, setRight] = useState(0);

  useEffect(() => {
    let raf = 0;
    function measure() {
      const el = document.querySelector('[data-tour-ui="sidebar"]');
      if (el && window.getComputedStyle(el).display !== "none") {
        setRight(el.getBoundingClientRect().right);
      } else {
        setRight(0);
      }
      raf = requestAnimationFrame(measure);
    }
    raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  }, []);

  return right;
}

/** A copper ring around the real element — no backdrop, nothing dimmed or
 *  covered. The page underneath stays exactly as usable as it always is. */
function HighlightRing({ rect }: { rect: DOMRect | null }) {
  if (!rect) return null;
  return (
    <div
      className="pointer-events-none fixed z-[9998] rounded-[10px] shadow-[0_0_0_3px_var(--copper),0_0_0_7px_rgba(200,121,65,0.2),0_0_22px_4px_rgba(200,121,65,0.35)]"
      style={{
        top: rect.top - PAD,
        left: rect.left - PAD,
        width: rect.width + PAD * 2,
        height: rect.height + PAD * 2,
      }}
    />
  );
}

/** A target filling most of the viewport (e.g. Scripts' edge-to-edge iframe
 *  embed) isn't something a ring can meaningfully outline — it would just
 *  trace the screen's own edges — and isn't a useful anchor for the panel
 *  either, so both treat it the same as "no target". */
function isHugeTarget(rect: DOMRect): boolean {
  if (typeof window === "undefined") return false;
  return rect.width > window.innerWidth * 0.55 && rect.height > window.innerHeight * 0.55;
}

function JumpMenu({ role, onBack }: { role: Role; onBack: () => void }) {
  const { jumpTo, currentStep } = useTour();
  const sections = visibleSections(role);

  return (
    <div className="flex max-h-[75vh] flex-col">
      <div className="flex shrink-0 items-center gap-2.5 border-b border-border p-4">
        <button type="button" onClick={onBack} aria-label="Back to step" className="text-muted hover:text-white">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h2 className="font-condensed text-sm font-extrabold tracking-[0.1em] text-white uppercase">Jump To</h2>
      </div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="font-condensed mb-1.5 text-[11px] font-bold tracking-[0.14em] text-copper uppercase">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.steps.map((step) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => {
                    jumpTo(step.id);
                    onBack();
                  }}
                  className={cn(
                    "block w-full rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
                    currentStep?.id === step.id
                      ? "bg-copper/[0.15] text-copper"
                      : "text-muted hover:bg-white/[0.04] hover:text-white",
                  )}
                >
                  {step.title}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepPanel({ onShowMenu, notFound }: { onShowMenu: () => void; notFound: boolean }) {
  const { currentStep, next, back, skip, isFirst, isLast, position, total } = useTour();
  if (!currentStep) return null;

  return (
    <div className="flex max-h-[75vh] flex-col">
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border p-4">
        <h3 data-tour-ui="title" className="font-condensed text-sm font-extrabold tracking-[0.06em] text-white uppercase">
          {currentStep.title}
        </h3>
        <button type="button" onClick={skip} aria-label="End tour" className="shrink-0 text-muted hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <p className="text-sm text-muted">{currentStep.body}</p>
        {currentStep.selector && notFound && (
          <p className="mt-3 text-xs text-red-light">
            Couldn&apos;t find this on your account right now — it may need access you don&apos;t have.
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border p-3">
        <span className="font-condensed text-[11px] font-bold tracking-[0.08em] text-muted uppercase">
          {position} / {total}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onShowMenu}
            aria-label="Jump to a topic"
            title="Jump to a topic"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted hover:border-copper-dim hover:text-white"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={back}
            disabled={isFirst}
            aria-label="Back"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted hover:border-copper-dim hover:text-white disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label={isLast ? "Finish tour" : "Next step"}
            className="btn-metal-copper flex h-8 items-center gap-1 rounded-md px-3 text-xs font-bold uppercase"
          >
            {isLast ? "Finish" : "Next"}
            {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// Breathing room kept between the panel and whatever it's near — the
// sidebar's edge (it must never sit over the nav links) and the
// highlighted element itself (when it's placed next to one).
const SIDEBAR_GAP = 16;
const TARGET_GAP = 14;
// Rough floor for the step view's own height (title + a few lines of body +
// footer) — reserved so the panel never gets placed so close to the
// viewport's top/bottom edge that it renders mostly or fully off-screen,
// which a tall target (e.g. the chat channel list, which runs most of the
// viewport's height) could otherwise do.
const MIN_PANEL_HEIGHT = 300;

/** Positions the panel next to the current target — above/below it, never
 *  under the sidebar — so it moves around the page with the tour instead
 *  of staying parked in one spot. Falls back to a steady spot beside the
 *  sidebar when there's nothing sensible to anchor to (the intro/outro,
 *  a huge target, or one that couldn't be found). */
function computePanelStyle(rect: DOMRect | null, sidebarRight: number): React.CSSProperties {
  const minLeft = sidebarRight + SIDEBAR_GAP;
  const fallback: React.CSSProperties = {
    width: PANEL_WIDTH,
    top: "50%",
    left: minLeft,
    transform: "translateY(-50%)",
  };
  if (!rect || typeof window === "undefined") return fallback;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const spaceBelow = vh - rect.bottom;
  const spaceAbove = rect.top;
  const placeBelow = spaceBelow >= spaceAbove;
  const left = Math.min(Math.max(rect.left, minLeft), Math.max(minLeft, vw - PANEL_WIDTH - 16));

  if (placeBelow) {
    // Clamped so the panel's top edge never sits so low there's no room
    // left for its own content before the viewport ends.
    const top = Math.min(rect.bottom + PAD + TARGET_GAP, Math.max(16, vh - MIN_PANEL_HEIGHT));
    return { width: PANEL_WIDTH, top, left };
  }
  // Anchored by its bottom edge (translateY(-100%), grows upward from
  // here) — clamped the same way, just on the other side.
  const bottom = Math.max(Math.min(rect.top - PAD - TARGET_GAP, vh - 16), Math.min(MIN_PANEL_HEIGHT, vh - 16));
  return { width: PANEL_WIDTH, top: bottom, left, transform: "translateY(-100%)" };
}

/** Floats near whichever element the current step highlights — moving
 *  around the page along with the tour — but never over the content
 *  the tour is explaining, and never under the sidebar's own nav links.
 *  Tracks the sidebar's collapse/expand animation for that exclusion. */
function FloatingPanel({ role, rect, notFound }: { role: Role; rect: DOMRect | null; notFound: boolean }) {
  const [showMenu, setShowMenu] = useState(false);
  const sidebarRight = useSidebarRight();

  return (
    <div
      data-tour-ui="tooltip"
      className="fixed z-[9999] max-w-[88vw] overflow-hidden rounded-xl border border-copper-dim bg-surface shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
      style={computePanelStyle(rect, sidebarRight)}
    >
      {showMenu ? (
        <JumpMenu role={role} onBack={() => setShowMenu(false)} />
      ) : (
        <StepPanel onShowMenu={() => setShowMenu(true)} notFound={notFound} />
      )}
    </div>
  );
}

/** Compact icon button for the top-right action bar (see TopBarActions) —
 *  only ever rendered there, and only when that bar is told showTour=true,
 *  so useTour() always has a TourProvider ancestor when this mounts. */
export function TourOverlay({ role }: { role: Role }) {
  const { active, currentStep } = useTour();
  const { rect, notFound } = useTourTarget(currentStep);

  if (!active || !currentStep) return null;

  // A target filling most of the viewport (Scripts' edge-to-edge iframe)
  // gets treated the same as no target at all — see isHugeTarget.
  const effectiveRect = rect && !isHugeTarget(rect) ? rect : null;
  const showHighlight = Boolean(currentStep.selector) && !notFound && effectiveRect !== null;

  return (
    <>
      <HighlightRing rect={showHighlight ? effectiveRect : null} />
      <FloatingPanel role={role} rect={effectiveRect} notFound={notFound} />
    </>
  );
}
