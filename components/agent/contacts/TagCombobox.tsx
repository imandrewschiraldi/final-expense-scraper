"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { SUGGESTED_TAGS, SUGGESTED_TAG_CATEGORIES } from "@/lib/suggestedTags";
import { useTagColors } from "./useTagColors";

/** Tag pill-list + type-ahead input, shared by the Add/Edit Contact form and
 *  the Contact Drawer — shows the agency's standard suggested tags grouped
 *  by category while still letting an agent type and add any custom tag
 *  (Lead.tags stays free-form; see its own doc comment). */
export function TagCombobox({ tags, onAdd, onRemove }: { tags: string[]; onAdd: (tag: string) => void; onRemove: (tag: string) => void }) {
  const { colorFor, ensureColor } = useTagColors();
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);

  const grouped = useMemo(() => {
    const q = input.trim().toLowerCase();
    const available = SUGGESTED_TAGS.filter(
      (t) => !tags.includes(t.key) && (!q || t.key.toLowerCase().includes(q)),
    );
    return SUGGESTED_TAG_CATEGORIES.map((category) => ({
      category,
      items: available.filter((t) => t.category === category),
    })).filter((g) => g.items.length > 0);
  }, [input, tags]);

  const exactMatch = SUGGESTED_TAGS.some((t) => t.key.toLowerCase() === input.trim().toLowerCase());

  function add(tag: string) {
    const trimmed = tag.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    onAdd(trimmed);
    ensureColor(trimmed);
    setInput("");
    setOpen(false);
  }

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            style={{ backgroundColor: `${colorFor(tag)}26`, color: colorFor(tag) }}
            className="font-condensed inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide"
          >
            {tag}
            <button type="button" onClick={() => onRemove(tag)} aria-label={`Remove ${tag}`}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(input);
            }
          }}
          placeholder="Add or create tag…"
          className="h-7 w-36 text-xs"
        />
      </div>
      {open && (grouped.length > 0 || (input.trim() && !exactMatch)) && (
        <div className="absolute top-full left-0 z-30 mt-1 max-h-64 w-64 overflow-y-auto rounded-lg border border-border bg-surface p-2 shadow-xl">
          {input.trim() && !exactMatch && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => add(input)}
              className="font-condensed mb-1 block w-full rounded px-2 py-1.5 text-left text-xs font-bold text-teal-light uppercase hover:bg-surface2"
            >
              + Create &quot;{input.trim()}&quot;
            </button>
          )}
          {grouped.map((g) => (
            <div key={g.category} className="mb-1.5">
              <p className="font-condensed px-2 py-1 text-[10px] font-bold tracking-[0.1em] text-muted uppercase">{g.category}</p>
              {g.items.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => add(t.key)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-foreground hover:bg-surface2"
                >
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: t.color }} />
                  {t.key}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
