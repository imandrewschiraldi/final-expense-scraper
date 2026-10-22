"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { visibleSteps, type Role, type TourStep } from "@/lib/tour/steps";

const STORAGE_KEY = "tier1-tour-state";

type Persisted = { active: boolean; stepId: string | null; launcherHidden: boolean };

function readPersisted(): Persisted {
  const fallback: Persisted = { active: false, stepId: null, launcherHidden: false };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    return {
      active: Boolean(parsed.active),
      stepId: typeof parsed.stepId === "string" ? parsed.stepId : null,
      launcherHidden: Boolean(parsed.launcherHidden),
    };
  } catch {
    return fallback;
  }
}

function writePersisted(state: Persisted) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
  end: () => void;
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
  const [hydrated, setHydrated] = useState(false);
  // Set the moment the viewer ends/finishes the tour this session, so the
  // auto-start check below never re-fires and re-opens it — the server
  // write that records that is fire-and-forget and may not have landed yet
  // the instant React re-renders with active:false.
  const [dismissed, setDismissed] = useState(false);

  // Runs once per mount — including a remount caused by crossing a layout
  // boundary, which is exactly when an in-progress tour needs recovering.
  useEffect(() => {
    const persisted = readPersisted();
    setActive(persisted.active);
    setStepId(persisted.stepId);
    setLauncherHidden(persisted.launcherHidden);
    setHydrated(true);
  }, []);

  // Nothing was already in progress this session — check whether this
  // account has ever finished/dismissed the tour before. A brand-new
  // account (tourCompletedAt still null) gets it started automatically.
  useEffect(() => {
    if (!hydrated || active || dismissed || steps.length === 0) return;
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
  }, [hydrated, active, dismissed, steps]);

  useEffect(() => {
    if (!hydrated) return;
    writePersisted({ active, stepId, launcherHidden });
  }, [hydrated, active, stepId, launcherHidden]);

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

  // Marks the tour seen server-side — idempotent (only ever sets the
  // timestamp once) — whether the viewer finished it or skipped out.
  const end = useCallback(() => {
    fetch("/api/portal/tour/complete", { method: "POST" }).catch(() => {});
    setDismissed(true);
    setActive(false);
    setStepId(null);
  }, []);

  const next = useCallback(() => {
    if (index === -1) return;
    if (index >= steps.length - 1) {
      end();
      return;
    }
    goTo(steps[index + 1].id);
  }, [index, steps, goTo, end]);

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
    end,
    isFirst: index <= 0,
    isLast: index === steps.length - 1,
    position: index + 1,
    total: steps.length,
  };

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}
