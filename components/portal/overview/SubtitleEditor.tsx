"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { DEFAULT_OVERVIEW_SUBTITLE_TEXT } from "@/lib/overviewSubtitle";

export type SubtitleColor = "WHITE" | "GRAY" | "COPPER";
export type Subtitle = { text: string; color: SubtitleColor; bold: boolean };

const COLOR_OPTIONS: { value: SubtitleColor; label: string }[] = [
  { value: "WHITE", label: "White" },
  { value: "GRAY", label: "Gray" },
  { value: "COPPER", label: "Copper" },
];

export function subtitleClassName(color: SubtitleColor, bold: boolean) {
  return cn(color === "WHITE" ? "text-white" : color === "GRAY" ? "text-muted" : "", bold && "font-bold");
}

export function subtitleStyle(color: SubtitleColor): React.CSSProperties | undefined {
  return color === "COPPER" ? { color: "var(--copper-metal-hi)" } : undefined;
}

/** Admin-only edit affordance for Overview's welcome subtitle — a pencil
 *  next to the text, opening a small modal for the copy itself plus color
 *  and bold, rather than a dedicated settings page for three fields. */
export function SubtitleEditor({ current, onSaved }: { current: Subtitle; onSaved: (next: Subtitle) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(current.text);
  const [color, setColor] = useState<SubtitleColor>(current.color);
  const [bold, setBold] = useState(current.bold);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openModal() {
    setText(current.text);
    setColor(current.color);
    setBold(current.bold);
    setError(null);
    setOpen(true);
  }

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/overview-subtitle", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        // Blank text isn't rejected — the server resets it to the default
        // "Here's what's new..." message instead.
        body: JSON.stringify({ text: text.trim(), color, bold }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save.");
        return;
      }
      onSaved(data);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        aria-label="Edit welcome subtitle"
        title="Edit subtitle"
        className="mt-1.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted transition-colors hover:text-foreground"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Edit welcome subtitle" maxWidthClassName="max-w-md">
        <div className="space-y-4 p-5">
          <div>
            <label className="font-condensed mb-1.5 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
              Text
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 200))}
              rows={2}
              placeholder="Leave blank to use the default message"
              className="w-full resize-none rounded-lg border-copper-focus-gradient bg-surface2 px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none"
            />
          </div>

          <div>
            <label className="font-condensed mb-1.5 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
              Color
            </label>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setColor(opt.value)}
                  className={cn(
                    "font-condensed flex-1 rounded-md border-[1.5px] px-3 py-1.5 text-xs font-bold tracking-[0.08em] uppercase transition-colors",
                    color === opt.value ? "toggle-pill-active" : "btn-metal-copper",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={bold} onChange={(e) => setBold(e.target.checked)} className="h-4 w-4" />
            Bold
          </label>

          <div className="rounded-lg border border-border bg-surface2/60 p-3">
            <p className="font-condensed mb-1.5 text-[10px] font-bold tracking-[0.12em] text-muted uppercase">Preview</p>
            <p className={cn("text-sm", subtitleClassName(color, bold))} style={subtitleStyle(color)}>
              {text.trim() || DEFAULT_OVERVIEW_SUBTITLE_TEXT}
            </p>
          </div>

          {error && <p className="text-sm text-red-light">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
