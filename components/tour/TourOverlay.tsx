"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, HelpCircle, List, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { visibleSections, type Role, type TourStep } from "@/lib/tour/steps";
import { useTour } from "@/components/tour/TourProvider";

const PAD = 8;
const TOOLTIP_WIDTH = 340;
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
 *  its bounding box every frame so the spotlight follows scrolling, resizing, or layout shifts. */
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

function tooltipStyle(rect: DOMRect | null): React.CSSProperties {
  if (!rect || typeof window === "undefined") {
    return { top: "50%", left: "50%", transform: "translate(-50%, -50%)", maxWidth: TOOLTIP_WIDTH };
  }
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const spaceBelow = vh - rect.bottom;
  const spaceAbove = rect.top;
  const placeBelow = spaceBelow > 220 || spaceBelow >= spaceAbove;
  const left = Math.min(Math.max(rect.left, 16), Math.max(16, vw - TOOLTIP_WIDTH - 16));

  if (placeBelow) {
    return { top: rect.bottom + PAD + 14, left, maxWidth: TOOLTIP_WIDTH };
  }
  return { top: rect.top - PAD - 14, left, maxWidth: TOOLTIP_WIDTH, transform: "translateY(-100%)" };
}

function Spotlight({ rect }: { rect: DOMRect | null }) {
  const box = rect
    ? { x: rect.left - PAD, y: rect.top - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }
    : null;

  return (
    <svg className="pointer-events-none fixed inset-0 z-[9998] h-full w-full">
      <defs>
        <mask id="tour-spotlight-mask">
          <rect x="0" y="0" width="100%" height="100%" fill="white" />
          {box && <rect x={box.x} y={box.y} width={box.width} height={box.height} rx={10} fill="black" />}
        </mask>
      </defs>
      <rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.72)" mask="url(#tour-spotlight-mask)" />
      {box && (
        <rect
          x={box.x}
          y={box.y}
          width={box.width}
          height={box.height}
          rx={10}
          fill="none"
          stroke="var(--copper)"
          strokeWidth={2.5}
        />
      )}
    </svg>
  );
}

function TourMenu({ role, onClose }: { role: Role; onClose: () => void }) {
  const { jumpTo, currentStep } = useTour();
  const sections = visibleSections(role);

  return (
    <div className="fixed inset-0 z-[10000] flex justify-end bg-black/50" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-xs flex-col overflow-y-auto border-l border-copper-dim bg-surface p-4 shadow-[0_0_60px_rgba(0,0,0,0.6)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-condensed text-sm font-extrabold tracking-[0.1em] text-white uppercase">Jump To</h2>
          <button type="button" onClick={onClose} aria-label="Close jump menu" className="text-muted hover:text-white">
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
        <div className="space-y-5">
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
                    onClick={() => jumpTo(step.id)}
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
    </div>
  );
}

function LauncherButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Take the platform tour"
      title="Take the platform tour"
      className="btn-metal-copper fixed right-5 bottom-5 z-[9990] flex h-12 w-12 items-center justify-center rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
    >
      <HelpCircle className="h-5.5 w-5.5" />
    </button>
  );
}

export function TourOverlay({ role }: { role: Role }) {
  const { active, currentStep, menuOpen, setMenuOpen, start, next, back, end, isFirst, isLast, position, total } =
    useTour();
  const { rect, notFound } = useTourTarget(currentStep);

  if (!active || !currentStep) {
    return <LauncherButton onClick={start} />;
  }

  const showSpotlight = Boolean(currentStep.selector) && !notFound;

  return (
    <>
      <Spotlight rect={showSpotlight ? rect : null} />
      <div
        data-tour-ui="tooltip"
        className="fixed z-[9999] rounded-xl border border-copper-dim bg-surface p-4 shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
        style={tooltipStyle(showSpotlight ? rect : null)}
      >
        <div className="mb-2 flex items-start justify-between gap-3">
          <h3 data-tour-ui="title" className="font-condensed text-sm font-extrabold tracking-[0.06em] text-white uppercase">
            {currentStep.title}
          </h3>
          <button type="button" onClick={end} aria-label="End tour" className="shrink-0 text-muted hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-3 text-sm text-muted">{currentStep.body}</p>
        {currentStep.selector && notFound && (
          <p className="mb-3 text-xs text-red-light">
            Couldn&apos;t find this on your account right now — it may need access you don&apos;t have.
          </p>
        )}
        <div className="flex items-center justify-between gap-2">
          <span className="font-condensed text-[11px] font-bold tracking-[0.08em] text-muted uppercase">
            {position} / {total}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
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
      {menuOpen && <TourMenu role={role} onClose={() => setMenuOpen(false)} />}
    </>
  );
}
