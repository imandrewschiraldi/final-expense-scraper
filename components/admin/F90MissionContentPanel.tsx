"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import type { F90Phase, F90Step } from "@/lib/f90Content";

type OverrideRow = {
  stepKey: string;
  title: string | null;
  description: string | null;
  videoUrl: string | null;
  links: { label: string; href: string | null }[] | null;
};

type LinkRow = { label: string; href: string };

type StepEditState = {
  title: string;
  description: string;
  videoUrl: string;
  links: LinkRow[];
};

function defaultState(step: F90Step, override?: OverrideRow): StepEditState {
  return {
    title: override?.title ?? step.title,
    description: override?.description ?? step.description,
    videoUrl: override?.videoUrl ?? "",
    links: (override?.links ?? step.links ?? []).map((l) => ({
      label: l.label,
      href: l.href ?? "",
    })),
  };
}

/** Lets an admin fully override any F90 mission's title, description,
 *  video, and links — without touching lib/f90Content.ts — by writing to
 *  F90StepContent (see app/api/admin/f90/content). Starts every field
 *  pre-filled with the mission's current effective text (its override, or
 *  the code default if it has none) so an admin can tweak just one field
 *  without retyping the rest. */
export function F90MissionContentPanel({
  phases,
  initialOverrides,
}: {
  phases: F90Phase[];
  initialOverrides: OverrideRow[];
}) {
  const overrideByKey = new Map(initialOverrides.map((o) => [o.stepKey, o]));
  const allSteps = phases.flatMap((p) => p.steps);

  const [state, setState] = useState<Record<string, StepEditState>>(() =>
    Object.fromEntries(allSteps.map((s) => [s.key, defaultState(s, overrideByKey.get(s.key))])),
  );
  const [customized, setCustomized] = useState<Set<string>>(
    () => new Set(initialOverrides.map((o) => o.stepKey)),
  );
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateField<K extends keyof StepEditState>(key: string, field: K, value: StepEditState[K]) {
    setState((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
    setSavedKey(null);
  }

  function addLink(key: string) {
    setState((prev) => ({
      ...prev,
      [key]: { ...prev[key], links: [...prev[key].links, { label: "", href: "" }] },
    }));
  }

  function updateLink(key: string, index: number, field: keyof LinkRow, value: string) {
    setState((prev) => {
      const links = prev[key].links.map((l, i) => (i === index ? { ...l, [field]: value } : l));
      return { ...prev, [key]: { ...prev[key], links } };
    });
  }

  function removeLink(key: string, index: number) {
    setState((prev) => ({
      ...prev,
      [key]: { ...prev[key], links: prev[key].links.filter((_, i) => i !== index) },
    }));
  }

  async function save(step: F90Step) {
    setBusyKey(step.key);
    setError(null);
    try {
      const edit = state[step.key];
      const res = await fetch(`/api/admin/f90/content/${step.key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: edit.title,
          description: edit.description,
          videoUrl: edit.videoUrl,
          links: edit.links,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Failed to save.");
        return;
      }
      setCustomized((prev) => new Set(prev).add(step.key));
      setSavedKey(step.key);
    } finally {
      setBusyKey(null);
    }
  }

  async function resetToDefault(step: F90Step) {
    setBusyKey(step.key);
    setError(null);
    try {
      const res = await fetch(`/api/admin/f90/content/${step.key}`, { method: "DELETE" });
      if (!res.ok) {
        setError("Failed to reset.");
        return;
      }
      setState((prev) => ({ ...prev, [step.key]: defaultState(step) }));
      setCustomized((prev) => {
        const next = new Set(prev);
        next.delete(step.key);
        return next;
      });
      setSavedKey(step.key);
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div>
      <p className="mb-6 max-w-2xl text-sm text-muted">
        Override any mission&apos;s title, description, links, or add a video —
        changes show up immediately on every enrolled agent&apos;s F90 tab. Leave a
        mission alone and it keeps using its built-in text.
      </p>
      {error && <p className="mb-4 text-sm text-red-light">{error}</p>}

      <div className="space-y-6">
        {phases
          .filter((phase) => phase.steps.length > 0)
          .map((phase) => (
            <div key={phase.key}>
              <h3 className="font-condensed mb-2 text-xs font-bold tracking-[0.12em] text-muted uppercase">
                {phase.subtitle} · {phase.title}
              </h3>
              <Card className="divide-y divide-border p-0">
                {phase.steps.map((step) => {
                  const edit = state[step.key];
                  const expanded = expandedKey === step.key;
                  const isCustomized = customized.has(step.key);
                  return (
                    <div key={step.key} className="p-4">
                      <button
                        type="button"
                        onClick={() => setExpandedKey(expanded ? null : step.key)}
                        className="flex w-full items-center justify-between gap-3 text-left"
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{edit.title}</span>
                          {isCustomized && (
                            <span className="font-condensed rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide text-copper uppercase bg-copper-glow">
                              Customized
                            </span>
                          )}
                        </span>
                        {expanded ? (
                          <ChevronUp className="h-4 w-4 shrink-0 text-muted" />
                        ) : (
                          <ChevronDown className="h-4 w-4 shrink-0 text-muted" />
                        )}
                      </button>

                      {expanded && (
                        <div className="mt-4 space-y-4">
                          <div>
                            <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.1em] text-muted uppercase">
                              Mission Title
                            </label>
                            <Input
                              value={edit.title}
                              onChange={(e) => updateField(step.key, "title", e.target.value)}
                            />
                          </div>

                          <div>
                            <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.1em] text-muted uppercase">
                              Mission Description
                            </label>
                            <textarea
                              value={edit.description}
                              onChange={(e) => updateField(step.key, "description", e.target.value)}
                              rows={4}
                              className="w-full rounded-lg border border-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.1em] text-muted uppercase">
                              Video URL
                            </label>
                            <p className="mb-1.5 text-xs text-muted">
                              A YouTube, Vimeo, or Loom link — shown as an embedded
                              player under the mission on the agent&apos;s F90 tab.
                              Leave blank for no video.
                            </p>
                            <Input
                              value={edit.videoUrl}
                              onChange={(e) => updateField(step.key, "videoUrl", e.target.value)}
                              placeholder="https://www.youtube.com/watch?v=..."
                            />
                          </div>

                          <div>
                            <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.1em] text-muted uppercase">
                              Links
                            </label>
                            <div className="space-y-2">
                              {edit.links.map((link, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <Input
                                    value={link.label}
                                    onChange={(e) => updateLink(step.key, i, "label", e.target.value)}
                                    placeholder="Link label"
                                    className="flex-1"
                                  />
                                  <Input
                                    value={link.href}
                                    onChange={(e) => updateLink(step.key, i, "href", e.target.value)}
                                    placeholder="https://..."
                                    className="flex-[1.5]"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeLink(step.key, i)}
                                    className="shrink-0 rounded-md p-2 text-muted hover:text-red-light"
                                    aria-label="Remove link"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              ))}
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => addLink(step.key)}
                                className="text-xs"
                              >
                                <Plus className="mr-1 h-3.5 w-3.5" />
                                Add Link
                              </Button>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-2">
                            <Button
                              onClick={() => save(step)}
                              disabled={busyKey === step.key}
                              className={cn("text-xs")}
                            >
                              {busyKey === step.key
                                ? "Saving…"
                                : savedKey === step.key
                                  ? "Saved"
                                  : "Save Changes"}
                            </Button>
                            {isCustomized && (
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => resetToDefault(step)}
                                disabled={busyKey === step.key}
                                className="text-xs"
                              >
                                <RotateCcw className="mr-1 h-3.5 w-3.5" />
                                Reset to Default
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </Card>
            </div>
          ))}
      </div>
    </div>
  );
}
