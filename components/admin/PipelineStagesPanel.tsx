"use client";

import { useEffect, useState } from "react";
import { GripVertical, Lock, Pencil, Plus, Trash2 } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
import {
  PIPELINE_STAGE_COLOR_TOKENS,
  PIPELINE_STAGE_COLOR_CLASSES,
  type PipelineStageColorToken,
} from "@/lib/pipelineStageColors";

type Phase = "LEAD" | "CLIENT";

type Stage = {
  id: string;
  phase: Phase;
  name: string;
  order: number;
  colorToken: string;
  systemKey: string | null;
};

function colorClasses(token: string) {
  return (
    PIPELINE_STAGE_COLOR_CLASSES[token as PipelineStageColorToken] ??
    PIPELINE_STAGE_COLOR_CLASSES.muted
  );
}

function ColorPicker({
  value,
  onChange,
}: {
  value: PipelineStageColorToken;
  onChange: (token: PipelineStageColorToken) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {PIPELINE_STAGE_COLOR_TOKENS.map((token) => (
        <button
          key={token}
          type="button"
          onClick={() => onChange(token)}
          aria-label={token}
          className={cn(
            "h-7 w-7 rounded-full ring-2 ring-offset-2 ring-offset-surface transition-shadow",
            colorClasses(token).dot,
            value === token ? "ring-white" : "ring-transparent",
          )}
        />
      ))}
    </div>
  );
}

function StageForm({
  phase,
  stage,
  onClose,
  onSaved,
}: {
  phase: Phase;
  stage: Stage | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = stage !== null;
  const [name, setName] = useState(stage?.name ?? "");
  const [colorToken, setColorToken] = useState<PipelineStageColorToken>(
    (stage?.colorToken as PipelineStageColorToken) ?? "copper",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    if (!name.trim()) return setError("Give it a name.");

    setSaving(true);
    try {
      const res = await fetch(
        isEdit
          ? `/api/admin/pipeline/stages/${stage.id}`
          : "/api/admin/pipeline/stages",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isEdit
              ? { name: name.trim(), colorToken }
              : { phase, name: name.trim(), colorToken },
          ),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save.");
        return;
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={
        isEdit
          ? "Edit Stage"
          : phase === "LEAD"
            ? "Add Lead Stage"
            : "Add Client Stage"
      }
      maxWidthClassName="max-w-md"
    >
      <div className="space-y-3">
        <Input
          placeholder="Stage name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <ColorPicker value={colorToken} onChange={setColorToken} />
        {error && <p className="text-sm text-red-light">{error}</p>}
        <Button onClick={save} disabled={saving} className="w-full">
          {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Stage"}
        </Button>
      </div>
    </Modal>
  );
}

function StageRow({
  stage,
  onEdit,
  onDeleted,
}: {
  stage: Stage;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const isSystem = stage.systemKey !== null;

  async function remove() {
    if (!confirm(`Remove the "${stage.name}" stage?`)) return;
    const res = await fetch(`/api/admin/pipeline/stages/${stage.id}`, {
      method: "DELETE",
    });
    if (res.ok) onDeleted();
  }

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: stage.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const colors = colorClasses(stage.colorToken);

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="flex items-center gap-3 py-2.5">
        <span
          {...attributes}
          {...listeners}
          title="Drag to reorder"
          className="flex h-6 w-6 shrink-0 cursor-grab touch-none items-center justify-center text-muted active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </span>
        <span className={cn("h-3 w-3 shrink-0 rounded-full", colors.dot)} />
        <span
          className={cn(
            "min-w-0 flex-1 truncate rounded-md px-2 py-1 text-sm font-semibold",
            colors.badgeBg,
            colors.badgeText,
          )}
        >
          {stage.name}
        </span>
        {isSystem && (
          <span
            title="Required stage — tied to core account logic"
            className="shrink-0 text-muted"
          >
            <Lock className="h-3.5 w-3.5" />
          </span>
        )}
        <button
          type="button"
          onClick={onEdit}
          aria-label="Edit"
          className="shrink-0 text-muted hover:text-foreground"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={isSystem}
          aria-label="Delete"
          title={isSystem ? "Required stages can't be deleted" : "Delete"}
          className="shrink-0 text-muted hover:text-red-light disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:text-muted"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </Card>
    </div>
  );
}

function PhaseColumn({
  phase,
  title,
  description,
}: {
  phase: Phase;
  title: string;
  description: string;
}) {
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Stage | "new" | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor),
  );

  function load() {
    fetch(`/api/admin/pipeline/stages?phase=${phase}`)
      .then((res) => res.json())
      .then((data) => setStages(data.stages ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = stages.map((s) => s.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = [...stages];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    setStages(reordered);
    await fetch("/api/admin/pipeline/stages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phase, reorder: reordered.map((s) => s.id) }),
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-condensed text-lg font-extrabold tracking-wide text-white uppercase">
          {title}
        </h2>
        <p className="text-sm text-muted">{description}</p>
      </div>

      <Button onClick={() => setEditing("new")} variant="secondary">
        <Plus className="size-4" />
        Add Stage
      </Button>

      {loading ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={stages.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {stages.map((stage) => (
                <StageRow
                  key={stage.id}
                  stage={stage}
                  onEdit={() => setEditing(stage)}
                  onDeleted={load}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {editing && (
        <StageForm
          phase={phase}
          stage={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}

function SeedStagesButton() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/pipeline/seed-stages", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setResult(data.error ?? "Setup failed.");
        return;
      }
      setResult(
        `Done — ${data.stagesSeeded} stages ready, ${data.policiesLeadTypeBackfilled} ` +
          `${data.policiesLeadTypeBackfilled === 1 ? "policy" : "policies"} backfilled from their lead, ` +
          `${data.policiesLeadTypeDefaulted} defaulted to Veterans Final Expense.`,
      );
    } catch {
      setResult("Setup failed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <Card className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-white">One-time setup</p>
        <p className="text-xs text-muted">
          Assigns every existing lead and policy to its matching stage above. A
          policy with no linked lead and no pipeline is defaulted to Veterans
          Final Expense. Safe to run more than once — never overwrites a stage,
          pipeline, or default that&apos;s already been set.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {result && <p className="text-xs text-muted">{result}</p>}
        <Button onClick={run} disabled={running} variant="secondary">
          {running ? "Running..." : "Run Setup"}
        </Button>
      </div>
    </Card>
  );
}

export function PipelineStagesPanel() {
  return (
    <div className="space-y-8">
      <SeedStagesButton />
      <div className="grid gap-8 lg:grid-cols-2">
        <PhaseColumn
          phase="LEAD"
          title="Lead Stages"
          description="Shared by My Leads, the Vault, and every lead pipeline (Mortgage Protection Leads, Final Expense Leads, ...)."
        />
        <PhaseColumn
          phase="CLIENT"
          title="Client Stages"
          description="Shared by every client pipeline (Mortgage Protection Clients, Final Expense Clients, ...) once a policy is submitted."
        />
      </div>
    </div>
  );
}
