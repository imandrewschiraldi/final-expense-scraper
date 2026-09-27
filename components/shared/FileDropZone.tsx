"use client";

import { useState, DragEvent, RefObject } from "react";
import { cn } from "@/lib/cn";

/**
 * A drag-and-drop file picker that stays backed by a real <input type="file">
 * — dropped files are synced onto inputRef.current.files via DataTransfer,
 * so any existing code reading inputRef.current.files on submit keeps
 * working unchanged. Clicking the zone opens the native file dialog.
 */
export function FileDropZone({
  inputRef,
  accept,
  multiple = false,
  disabled = false,
  onFilesChosen,
  hint,
  selectedLabel,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  onFilesChosen: (files: FileList | null) => void;
  hint: string;
  selectedLabel?: string;
}) {
  const [dragging, setDragging] = useState(false);

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (disabled) return;
    setDragging(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;

    const dropped = e.dataTransfer.files;
    if (!dropped || dropped.length === 0) return;

    const list = multiple ? Array.from(dropped) : [dropped[0]];
    const dataTransfer = new DataTransfer();
    list.forEach((f) => dataTransfer.items.add(f));

    if (inputRef.current) {
      inputRef.current.files = dataTransfer.files;
    }
    onFilesChosen(dataTransfer.files);
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={cn(
        "flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        dragging ? "border-copper bg-copper/10" : "border-border bg-surface hover:border-copper-dim",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(e) => onFilesChosen(e.target.files)}
        className="hidden"
      />
      {selectedLabel ? (
        <p className="text-sm text-white">{selectedLabel}</p>
      ) : (
        <p className="text-sm text-muted">{hint}</p>
      )}
      <p className="text-xs text-muted">Drag and drop, or click to browse</p>
    </div>
  );
}
