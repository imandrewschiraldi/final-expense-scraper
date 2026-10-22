"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { visibleSteps, type Role, type TourStep } from "@/lib/tour/steps";

// Also cleared by the login page on every sign-in, which is what makes a
// skipped tour come back on the next login rather than only within the
// session it was skipped in.
export const TOUR_STORAGE_KEY = "tier1-tour-state";

type Persisted = {
  active: boolean;
  stepId: string | null;
  launcherHidden: boolean;
  // Set when the viewer closes the tour before finishing it. Persisted (not
  // just React state) so it survives the remounts that crossing /portal,
  // /agent, and /admin's separate root layouts causes — otherwise the
  // auto-start check below would re-open it on the very next nav. Cleared
  // only by a fresh login, so skipping doesn't mean "never again," just
  // "not right now."
  skippedThisSession: boolean;
};

function readPersisted(): Persisted {
  const fallback: Persisted = { active: false, stepId: null, launcherHidden: false, skippedThisSession: false };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = sessionStorage.getItem(TOUR_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    return {
      active: Boolean(parsed.active),
      stepId: typeof parsed.stepId === "string" ? parsed.stepId : null,
      launcherHidden: Boolean(parsed.launcherHidden),
      skippedThisSession: Boolean(parsed.skippedThisSession),
    };
  } catch {
    return fallback;
  }
}

function writePersisted(state: Persisted) {
  try {
    sessionStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private browsing / storage disabled — the tour just won't survive a reload.
  }
}

type TourContextValue = {
  active: boolean;
  currentStep: TourStep | null;
  launcherHidden: boolean;
  hideLauncher: () => void;
  start: () => void;
  next: () => void;
  back: () => void;
  jumpTo: (id: string) => void;
  /** Closes the tour without finishing it — comes back on the next login. */
  skip: () => void;
  isFirst: boolean;
  isLast: boolean;
  position: number;
  total: number;
};

const TourContext = createContext<TourContextValue | null>(null);

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within a TourProvider");
  return ctx;
}

/**
 * Drives the platform tour's state, auto-start, and cross-page navigation.
 *
 * Only ever mounted for Manager/Agent roles (see AppShell) — Admin never
 * sees the tour at all.
 *
 * Active/step state is persisted to sessionStorage (not just React state)
 * because /portal, /agent, and /admin each have their own root layout —
 * crossing between them (most steps do) fully remounts this provider.
 * Reading the saved step back on mount is what lets the tour survive that
 * remount instead of resetting.
 */
export function TourProvider({ role, children }: { role: Role; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const steps = useMemo(() => visibleSteps(role), [role]);

  const [active, setActive] = useState(false);
  const [stepId, setStepId] = useState<string | null>(null);
  const [launcherHidden, setLauncherHidden] = useState(false);
  const [skippedThisSession, setSkippedThisSession] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Runs once per mount — including a remount caused by crossing a layout
  // boundary, which is exactly when an in-progress tour needs recovering.
  useEffect(() => {
    const persisted = readPersisted();
    setActive(persisted.active);
    setStepId(persisted.stepId);
    setLauncherHidden(persisted.launcherHidden);
    setSkippedThisSession(persisted.skippedThisSession);
    setHydrated(true);
  }, []);

  // Nothing already in progress and not skipped this session — check
  // whether this account has ever actually finished the tour. An account
  // that hasn't (tourCompletedAt still null) gets it started automatically,
  // including an account that skipped out last login — skippedThisSession
  // only suppresses this for the rest of the *current* session.
  useEffect(() => {
    if (!hydrated || active || skippedThisSession || steps.length === 0) return;
    let cancelled = false;
    fetch("/api/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.profile) return;
        if (!data.profile.tourCompletedAt) {
          setActive(true);
          setStepId(steps[0].id);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [hydrated, active, skippedThisSession, steps]);

  useEffect(() => {
    if (!hydrated) return;
    writePersisted({ active, stepId, launcherHidden, skippedThisSession });
  }, [hydrated, active, stepId, launcherHidden, skippedThisSession]);

  const currentStep = useMemo(() => (stepId ? (steps.find((s) => s.id === stepId) ?? null) : null), [stepId, steps]);
  const index = currentStep ? steps.indexOf(currentStep) : -1;

  useEffect(() => {
    if (!hydrated || !active || !currentStep) return;
    if (currentStep.opensSidebarGroup) {
      window.dispatchEvent(new CustomEvent("tour:open-sidebar-group", { detail: currentStep.opensSidebarGroup }));
    }
    if (pathname !== currentStep.path) {
      router.push(currentStep.path);
    }
  }, [hydrated, active, currentStep, pathname, router]);

  const goTo = useCallback((id: string) => {
    setStepId(id);
  }, []);

  const start = useCallback(() => {
    if (steps.length === 0) return;
    setActive(true);
    goTo(steps[0].id);
  }, [steps, goTo]);

  // Reaching the last step and clicking Finish — marks the tour seen
  // server-side for good, so it never auto-starts again on any login.
  const finish = useCallback(() => {
    fetch("/api/portal/tour/complete", { method: "POST" }).catch(() => {});
    // The write above is fire-and-forget — without this, the auto-start
    // check could re-fire (active just became false) and re-open the tour
    // before that request lands, reading tourCompletedAt as still null.
    // Harmless to leave set afterward too: once truly completed server-side
    // no future login ever reaches this check again anyway.
    setSkippedThisSession(true);
    setActive(false);
    setStepId(null);
  }, []);

  // Closing out early — nothing is marked server-side, so it's still due;
  // only suppressed for the rest of this session, not permanently.
  const skip = useCallback(() => {
    setSkippedThisSession(true);
    setActive(false);
    setStepId(null);
  }, []);

  const next = useCallback(() => {
    if (index === -1) return;
    if (index >= steps.length - 1) {
      finish();
      return;
    }
    goTo(steps[index + 1].id);
  }, [index, steps, goTo, finish]);

  const back = useCallback(() => {
    if (index <= 0) return;
    goTo(steps[index - 1].id);
  }, [index, steps, goTo]);

  const hideLauncher = useCallback(() => setLauncherHidden(true), []);

  const value: TourContextValue = {
    active,
    currentStep: active ? currentStep : null,
    launcherHidden,
    hideLauncher,
    start,
    next,
    back,
    jumpTo: goTo,
    skip,
    isFirst: index <= 0,
    isLast: index === steps.length - 1,
    position: index + 1,
    total: steps.length,
  };

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}
