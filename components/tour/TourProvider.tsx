"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { visibleSteps, type Role, type TourStep } from "@/lib/tour/steps";

const STORAGE_KEY = "tier1-tour-state";

type Persisted = { active: boolean; stepId: string | null };

function readPersisted(): Persisted {
  if (typeof window === "undefined") return { active: false, stepId: null };
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { active: false, stepId: null };
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    return { active: Boolean(parsed.active), stepId: typeof parsed.stepId === "string" ? parsed.stepId : null };
  } catch {
    return { active: false, stepId: null };
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
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
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
 * Drives the platform tour's state and cross-page navigation.
 *
 * State is persisted to sessionStorage (not just React state) because
 * /portal, /agent, and /admin each have their own root layout — crossing
 * between them (e.g. a step on /agent/dashboard followed by one on
 * /admin/leads) fully remounts this provider. Reading the saved step back
 * on mount is what lets the tour survive that remount instead of resetting.
 */
export function TourProvider({ role, children }: { role: Role; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const steps = useMemo(() => visibleSteps(role), [role]);

  const [active, setActive] = useState(false);
  const [stepId, setStepId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Runs once per mount — including a remount caused by crossing a layout
  // boundary, which is exactly when saved state needs recovering.
  useEffect(() => {
    const persisted = readPersisted();
    setActive(persisted.active);
    setStepId(persisted.stepId);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writePersisted({ active, stepId });
  }, [hydrated, active, stepId]);

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
    setMenuOpen(false);
  }, []);

  const start = useCallback(() => {
    if (steps.length === 0) return;
    setActive(true);
    goTo(steps[0].id);
  }, [steps, goTo]);

  const end = useCallback(() => {
    setActive(false);
    setStepId(null);
    setMenuOpen(false);
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

  const value: TourContextValue = {
    active,
    currentStep: active ? currentStep : null,
    menuOpen,
    setMenuOpen,
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
