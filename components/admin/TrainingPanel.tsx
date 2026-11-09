"use client";

import { useState } from "react";
import { upload } from "@vercel/blob/client";
import { GripVertical, ImagePlus, Upload, X } from "lucide-react";
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
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  TRAINING_IMAGE_MAX_BYTES,
  TRAINING_IMAGE_TYPES,
  TRAINING_VIDEO_MAX_BYTES,
  TRAINING_VIDEO_TYPES,
} from "@/lib/training";

type LessonImage = { id: string; url: string };
type LessonVideo = { id: string; url: string; thumbnailUrl: string | null };
type LessonVideoInput = { url: string; thumbnailUrl: string | null };

type Lesson = {
  id: string;
  title: string;
  description: string | null;
  videos: LessonVideo[];
  images: LessonImage[];
  order: number;
};

type LessonInput = {
  title: string;
  description: string;
  videos: LessonVideoInput[];
  images: string[];
};

type Chapter = {
  id: string;
  title: string;
  order: number;
  lessons: Lesson[];
};

type Module = {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  order: number;
  chapters: Chapter[];
};

function TextArea({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="min-h-16 w-full rounded-lg border-copper-focus-gradient bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none"
    />
  );
}

/** Upload + thumbnail grid for a lesson's photos, shared by the create form
 *  and the edit form. Uploads happen immediately on file pick (to Blob
 *  storage); the parent only holds the resulting URLs, same as a plain text
 *  field — an uploaded-but-never-saved image just sits unused, same
 *  tradeoff the chat image upload already makes. */
function ImagePicker({
  images,
  onChange,
}: {
  images: string[];
  onChange: (urls: string[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    for (const file of files) {
      if (
        !TRAINING_IMAGE_TYPES.includes(
          file.type as (typeof TRAINING_IMAGE_TYPES)[number],
        )
      ) {
        setError(
          `${file.name} isn't a supported image type (PNG, JPEG, GIF, or WebP).`,
        );
        return;
      }
      if (file.size > TRAINING_IMAGE_MAX_BYTES) {
        setError(`${file.name} is too large (8MB max).`);
        return;
      }
    }

    setError(null);
    setUploading(true);
    try {
      const uploaded = await Promise.all(
        files.map(async (file) => {
          const form = new FormData();
          form.append("file", file);
          const res = await fetch("/api/admin/training/images", {
            method: "POST",
            body: form,
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error ?? "That image didn't upload.");
          }
          const data = (await res.json()) as { url: string };
          return data.url;
        }),
      );
      onChange([...images, ...uploaded]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "That image didn't upload.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-2">
        {images.map((url, i) => (
          <div
            key={`${url}-${i}`}
            className="group relative h-16 w-16 overflow-hidden rounded-lg border border-border"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(images.filter((_, idx) => idx !== i))}
              aria-label="Remove photo"
              className="absolute top-0.5 right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border border-dashed border-border text-muted transition-colors hover:border-copper-dim-gradient hover:text-foreground">
          <input
            type="file"
            accept={TRAINING_IMAGE_TYPES.join(",")}
            multiple
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
          {uploading ? (
            <span className="text-xs">...</span>
          ) : (
            <ImagePlus className="h-5 w-5" />
          )}
        </label>
      </div>
      {error && <p className="text-xs text-red-light">{error}</p>}
    </div>
  );
}

/** A module's cover image — the thumbnail its card shows on the agent
 *  course list. Single image, unlike ImagePicker's gallery, so this is a
 *  bigger preview tile with the file picker built into clicking the tile
 *  itself rather than a separate "add" square next to a grid. */
function ThumbnailPicker({
  url,
  onChange,
}: {
  url: string | null;
  onChange: (url: string | null) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (
      !TRAINING_IMAGE_TYPES.includes(
        file.type as (typeof TRAINING_IMAGE_TYPES)[number],
      )
    ) {
      setError(
        `${file.name} isn't a supported image type (PNG, JPEG, GIF, or WebP).`,
      );
      return;
    }
    if (file.size > TRAINING_IMAGE_MAX_BYTES) {
      setError(`${file.name} is too large (8MB max).`);
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/training/images", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "That image didn't upload.");
      }
      const data = (await res.json()) as { url: string };
      onChange(data.url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "That image didn't upload.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <label className="font-condensed block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
        Cover image
      </label>
      {url ? (
        <div className="group relative aspect-video w-full max-w-xs overflow-hidden rounded-lg border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Remove cover image"
            className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <label className="flex aspect-video w-full max-w-xs cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-muted transition-colors hover:border-copper-dim-gradient hover:text-foreground">
          <input
            type="file"
            accept={TRAINING_IMAGE_TYPES.join(",")}
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              handleFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <ImagePlus className="h-5 w-5" />
          <span className="text-xs">
            {uploading ? "Uploading..." : "Add a cover image"}
          </span>
        </label>
      )}
      {error && <p className="text-xs text-red-light">{error}</p>}
    </div>
  );
}

/** A small square thumbnail picker for one video/link row — a channel's
 *  logo, a brand mark, anything that makes that row recognizable at a
 *  glance instead of every link reading as the same bare hostname. Only
 *  matters for a link that falls back to an "Open Link" card; a trackable
 *  video already has its own real thumbnail and ignores this, but it's
 *  offered on every row since admins can't predict that from a URL alone. */
function LinkThumbnailField({
  url,
  onChange,
  onError,
}: {
  url: string | null;
  onChange: (url: string | null) => void;
  onError: (message: string) => void;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (
      !TRAINING_IMAGE_TYPES.includes(
        file.type as (typeof TRAINING_IMAGE_TYPES)[number],
      )
    ) {
      onError(
        `${file.name} isn't a supported image type (PNG, JPEG, GIF, or WebP).`,
      );
      return;
    }
    if (file.size > TRAINING_IMAGE_MAX_BYTES) {
      onError(`${file.name} is too large (8MB max).`);
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/training/images", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "That thumbnail didn't upload.");
      }
      const data = (await res.json()) as { url: string };
      onChange(data.url);
    } catch (err) {
      onError(
        err instanceof Error ? err.message : "That thumbnail didn't upload.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      className="group relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-dashed border-border"
      title="Custom thumbnail for this link (e.g. a channel's profile picture)"
    >
      {url ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Remove thumbnail"
            className="absolute inset-0 flex items-center justify-center bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </>
      ) : (
        <label className="flex h-full w-full cursor-pointer items-center justify-center text-muted transition-colors hover:border-copper-dim-gradient hover:text-foreground">
          <input
            type="file"
            accept={TRAINING_IMAGE_TYPES.join(",")}
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              handleFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <ImagePlus className="h-4 w-4" />
        </label>
      )}
    </div>
  );
}

/** One video link — paste one (YouTube/Vimeo/Loom/a direct video file
 *  link), or upload a file straight from this device when there's no
 *  hosted link at all. An upload goes directly from the browser to Blob
 *  storage (see app/api/admin/training/video/route.ts) and simply fills
 *  in this same field with the resulting URL. A lesson can hold several
 *  of these — see VideoUrlList below. */
function VideoUrlField({
  video,
  onChange,
  onRemove,
  placeholder,
}: {
  video: LessonVideoInput;
  onChange: (video: LessonVideoInput) => void;
  onRemove: () => void;
  placeholder: string;
}) {
  const [uploading, setUploading] = useState(false);
  // A large file can take many minutes with zero visible change otherwise
  // — a flat "Uploading..." label is indistinguishable from one that's
  // actually frozen. Real percentage (from @vercel/blob's own progress
  // callback) lets an admin tell a slow transfer from a stuck one.
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (
      !TRAINING_VIDEO_TYPES.includes(
        file.type as (typeof TRAINING_VIDEO_TYPES)[number],
      )
    ) {
      setError(
        `${file.name} isn't a supported video type (MP4, WebM, or MOV).`,
      );
      return;
    }
    if (file.size > TRAINING_VIDEO_MAX_BYTES) {
      setError(`${file.name} is too large (3GB max).`);
      return;
    }

    setError(null);
    setUploading(true);
    setUploadPct(0);
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/admin/training/video",
        onUploadProgress: ({ percentage }) => setUploadPct(percentage),
      });
      onChange({ ...video, url: blob.url });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "That video didn't upload.",
      );
    } finally {
      setUploading(false);
      setUploadPct(null);
    }
  }

  return (
    <div
      className={cn(
        "space-y-1.5 rounded-lg transition-colors",
        dragOver && "outline-2 outline-dashed outline-copper",
      )}
      // A file dragged from the desktop (not just picked via the button)
      // drops anywhere on this field, not just on the Upload button itself.
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (uploading) return;
        handleFile(e.dataTransfer.files[0]);
      }}
    >
      <div className="flex gap-2">
        <LinkThumbnailField
          url={video.thumbnailUrl}
          onChange={(thumbnailUrl) => onChange({ ...video, thumbnailUrl })}
          onError={setError}
        />
        <div className="flex-1">
          <Input
            placeholder={placeholder}
            value={video.url}
            onChange={(e) => onChange({ ...video, url: e.target.value })}
          />
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-border px-3 text-xs text-muted transition-colors hover:border-copper-dim-gradient hover:text-foreground">
          <input
            type="file"
            // No `capture` attribute — leaving the source unrestricted is
            // what makes a phone's picker offer Camera Roll/Photo Library
            // (as well as Take Video) alongside Files, not just one of them.
            accept={TRAINING_VIDEO_TYPES.join(",")}
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              handleFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <Upload className="h-3.5 w-3.5" />
          {uploading
            ? `Uploading${uploadPct != null ? ` ${Math.round(uploadPct)}%` : "..."}`
            : "Upload"}
        </label>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove this link"
          title="Remove this link"
          className="shrink-0 rounded-lg border border-transparent px-2 text-muted transition-colors hover:border-border hover:text-red-light"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {uploading && uploadPct != null ? (
        <div className="space-y-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface2">
            <div
              className="h-full rounded-full bg-copper transition-[width]"
              style={{ width: `${Math.max(2, uploadPct)}%` }}
            />
          </div>
          <p className="text-[11px] text-muted">
            Uploading large files can take a while — this bar keeps moving as
            long as it&rsquo;s still going. Don&rsquo;t close this tab until it
            finishes.
          </p>
        </div>
      ) : (
        <p className="text-[11px] text-muted">
          Or drag and drop a video file here. Add a thumbnail (left) to make
          this link&rsquo;s card stand out — e.g. a channel&rsquo;s profile
          picture.
        </p>
      )}
      {error && <p className="text-xs text-red-light">{error}</p>}
    </div>
  );
}

/** A lesson's video links — a primary training video plus optional
 *  reference links (e.g. whole YouTube channels for agents to follow on
 *  their own, not a single video with an end). Always at least one
 *  (possibly blank) field is shown so there's somewhere to type the
 *  first link. */
function VideoUrlList({
  videos,
  onChange,
}: {
  videos: LessonVideoInput[];
  onChange: (videos: LessonVideoInput[]) => void;
}) {
  const rows = videos.length > 0 ? videos : [{ url: "", thumbnailUrl: null }];
  return (
    <div className="space-y-2">
      {rows.map((video, i) => (
        <VideoUrlField
          key={i}
          video={video}
          placeholder={
            i === 0
              ? "Video URL (YouTube, Vimeo, Loom, or a direct video file link) — optional if you add photos"
              : "Another link (e.g. a YouTube channel to follow) — optional"
          }
          onChange={(v) => onChange(rows.map((r, idx) => (idx === i ? v : r)))}
          onRemove={() => onChange(rows.filter((_, idx) => idx !== i))}
        />
      ))}
      <Button
        variant="ghost"
        onClick={() => onChange([...rows, { url: "", thumbnailUrl: null }])}
      >
        + Add another link
      </Button>
    </div>
  );
}

function LessonForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: LessonInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videos, setVideos] = useState<LessonVideoInput[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const canSubmit =
    title.trim() !== "" &&
    (videos.some((v) => v.url.trim() !== "") || images.length > 0);

  return (
    <div className="space-y-2 rounded-lg border-copper-dim-gradient bg-surface2 p-3">
      <Input
        placeholder="Lesson title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <VideoUrlList videos={videos} onChange={setVideos} />
      <TextArea
        placeholder="Description (optional)"
        value={description}
        onChange={setDescription}
      />
      <div>
        <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
          Photos
        </label>
        <ImagePicker images={images} onChange={setImages} />
      </div>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          disabled={loading || !canSubmit}
          onClick={async () => {
            setLoading(true);
            await onSubmit({ title, description, videos, images });
            setLoading(false);
          }}
        >
          {loading ? "Saving..." : "Add Lesson"}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function LessonRow({
  lesson,
  chapters,
  currentChapterId,
  onUpdate,
  onDelete,
  onMoveToChapter,
  onRemoveVideo,
  onRemoveImage,
}: {
  lesson: Lesson;
  chapters: { id: string; title: string }[];
  currentChapterId: string;
  onUpdate: (id: string, data: LessonInput) => Promise<void>;
  onDelete: (id: string) => void;
  onMoveToChapter: (chapterId: string) => Promise<void>;
  onRemoveVideo: (videoId: string) => Promise<void>;
  onRemoveImage: (imageId: string) => Promise<void>;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id });
  const dragStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(lesson.title);
  const [description, setDescription] = useState(lesson.description ?? "");
  const [videos, setVideos] = useState<LessonVideoInput[]>(
    lesson.videos.map((v) => ({ url: v.url, thumbnailUrl: v.thumbnailUrl })),
  );
  const [images, setImages] = useState(lesson.images.map((img) => img.url));
  const [saving, setSaving] = useState(false);
  const [moving, setMoving] = useState(false);
  // Tracks which single item (a video or image id) is mid-removal, so
  // only that control shows busy and the rest of the row stays clickable.
  const [removingKey, setRemovingKey] = useState<string | null>(null);

  async function handleRemoveVideo(videoId: string) {
    setRemovingKey(videoId);
    await onRemoveVideo(videoId);
    setRemovingKey(null);
  }

  async function handleRemoveImage(imageId: string) {
    setRemovingKey(imageId);
    await onRemoveImage(imageId);
    setRemovingKey(null);
  }

  async function handleMoveToChapter(chapterId: string) {
    if (chapterId === currentChapterId) return;
    setMoving(true);
    await onMoveToChapter(chapterId);
  }

  const canSubmit =
    title.trim() !== "" &&
    (videos.some((v) => v.url.trim() !== "") || images.length > 0);

  if (editing) {
    return (
      <div
        ref={setNodeRef}
        style={dragStyle}
        className="space-y-2 rounded-lg border-copper-dim-gradient bg-surface2 p-3"
      >
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        <VideoUrlList videos={videos} onChange={setVideos} />
        <TextArea value={description} onChange={setDescription} />
        <div>
          <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
            Photos
          </label>
          <ImagePicker images={images} onChange={setImages} />
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={saving || !canSubmit}
            onClick={async () => {
              setSaving(true);
              await onUpdate(lesson.id, {
                title,
                description,
                videos,
                images,
              });
              setSaving(false);
              setEditing(false);
            }}
          >
            Save
          </Button>
          <Button variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      className="flex items-start justify-between gap-3 rounded-lg border border-border bg-surface2 p-3"
    >
      <span
        {...attributes}
        {...listeners}
        title="Drag to reorder"
        className="flex h-6 w-6 shrink-0 cursor-grab touch-none items-center justify-center text-muted active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">{lesson.title}</p>
        {lesson.description && (
          <p className="mt-1 text-xs text-muted">{lesson.description}</p>
        )}
        {lesson.videos.map((v) => (
          <div key={v.id} className="mt-1 flex items-center gap-1.5">
            {v.thumbnailUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={v.thumbnailUrl}
                alt=""
                className="h-5 w-5 shrink-0 rounded object-cover"
              />
            )}
            <p className="truncate text-xs text-teal-light">{v.url}</p>
            <button
              type="button"
              onClick={() => handleRemoveVideo(v.id)}
              disabled={removingKey === v.id}
              aria-label="Remove this link"
              title="Remove this link"
              className="shrink-0 text-muted transition-colors hover:text-red-light disabled:opacity-40"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {lesson.images.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {lesson.images.map((img) => (
              <div
                key={img.id}
                className="group relative h-10 w-10 overflow-hidden rounded border border-border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(img.id)}
                  disabled={removingKey === img.id}
                  aria-label="Remove photo"
                  title="Remove photo"
                  className="absolute inset-0 flex items-center justify-center bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {chapters.length > 1 && (
          <Select
            value={currentChapterId}
            disabled={moving}
            onChange={(e) => handleMoveToChapter(e.target.value)}
            aria-label="Move to chapter"
            title="Move to a different chapter"
            className="w-auto py-1.5 text-xs"
          >
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </Select>
        )}
        <Button variant="ghost" onClick={() => setEditing(true)}>
          Edit
        </Button>
        <Button variant="danger" onClick={() => onDelete(lesson.id)}>
          Delete
        </Button>
      </div>
    </div>
  );
}

function ChapterForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (title: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <div className="flex items-center gap-2 rounded-lg border-copper-dim-gradient bg-surface2 p-3">
      <div className="flex-1">
        <Input
          placeholder="Chapter title (e.g. Getting Started)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <Button
        variant="secondary"
        disabled={loading || !title.trim()}
        onClick={async () => {
          setLoading(true);
          await onSubmit(title.trim());
          setLoading(false);
        }}
      >
        {loading ? "Saving..." : "Add Chapter"}
      </Button>
      <Button variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}

/** One chapter within a module — a drag handle to reorder it among its
 *  siblings, an inline-editable title, and its own lessons list (with its
 *  own drag-to-reorder, scoped to just this chapter). */
function ChapterRow({
  chapter,
  allChapters,
  onUpdateTitle,
  onDelete,
  onUpdateLesson,
  onDeleteLesson,
  onMoveLessonToChapter,
  onRemoveLessonVideo,
  onRemoveLessonImage,
  addingLesson,
  onStartAddLesson,
  onCancelAddLesson,
  onCreateLesson,
}: {
  chapter: Chapter;
  allChapters: { id: string; title: string }[];
  onUpdateTitle: (title: string) => Promise<void>;
  onDelete: () => void;
  onUpdateLesson: (id: string, data: LessonInput) => Promise<void>;
  onDeleteLesson: (id: string) => void;
  onMoveLessonToChapter: (lesson: Lesson, chapterId: string) => Promise<void>;
  onRemoveLessonVideo: (lesson: Lesson, videoId: string) => Promise<void>;
  onRemoveLessonImage: (lesson: Lesson, imageId: string) => Promise<void>;
  addingLesson: boolean;
  onStartAddLesson: () => void;
  onCancelAddLesson: () => void;
  onCreateLesson: (data: LessonInput) => Promise<void>;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chapter.id });
  const dragStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(chapter.title);
  const [saving, setSaving] = useState(false);

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      className="rounded-lg border border-border bg-surface2 p-3"
    >
      <div className="flex items-center gap-2">
        <span
          {...attributes}
          {...listeners}
          title="Drag to reorder"
          className="flex h-6 w-6 shrink-0 cursor-grab touch-none items-center justify-center text-muted active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </span>
        {editing ? (
          <>
            <div className="flex-1">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <Button
              variant="secondary"
              disabled={saving || !title.trim()}
              onClick={async () => {
                setSaving(true);
                await onUpdateTitle(title.trim());
                setSaving(false);
                setEditing(false);
              }}
            >
              Save
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setTitle(chapter.title);
                setEditing(false);
              }}
            >
              Cancel
            </Button>
          </>
        ) : (
          <>
            <p className="font-condensed flex-1 truncate text-sm font-bold tracking-wide text-white uppercase">
              {chapter.title}
            </p>
            <Button variant="ghost" onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button variant="danger" onClick={onDelete}>
              Delete
            </Button>
          </>
        )}
      </div>

      <div className="mt-3 space-y-2 pl-8">
        <SortableContext
          items={chapter.lessons.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          {chapter.lessons.map((lesson) => (
            <LessonRow
              key={lesson.id}
              lesson={lesson}
              chapters={allChapters}
              currentChapterId={chapter.id}
              onUpdate={onUpdateLesson}
              onDelete={onDeleteLesson}
              onMoveToChapter={(chapterId) =>
                onMoveLessonToChapter(lesson, chapterId)
              }
              onRemoveVideo={(videoId) => onRemoveLessonVideo(lesson, videoId)}
              onRemoveImage={(imageId) => onRemoveLessonImage(lesson, imageId)}
            />
          ))}
        </SortableContext>
        {chapter.lessons.length === 0 && (
          <p className="text-xs text-muted">No lessons in this chapter yet.</p>
        )}

        {addingLesson ? (
          <LessonForm onSubmit={onCreateLesson} onCancel={onCancelAddLesson} />
        ) : (
          <Button variant="ghost" onClick={onStartAddLesson}>
            + Add Lesson
          </Button>
        )}
      </div>
    </div>
  );
}

export function TrainingPanel({
  initialModules,
}: {
  initialModules: Module[];
}) {
  const [modules, setModules] = useState(initialModules);
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleDescription, setModuleDescription] = useState("");
  const [moduleThumbnailUrl, setModuleThumbnailUrl] = useState<string | null>(
    null,
  );
  const [addingChapterTo, setAddingChapterTo] = useState<string | null>(null);
  const [addingLessonTo, setAddingLessonTo] = useState<string | null>(null);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editThumbnailUrl, setEditThumbnailUrl] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor),
  );

  async function refresh() {
    const res = await fetch("/api/admin/training/modules");
    const data = await res.json();
    setModules(data.modules);
  }

  async function createModule() {
    const res = await fetch("/api/admin/training/modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: moduleTitle,
        description: moduleDescription,
        thumbnailUrl: moduleThumbnailUrl,
      }),
    });
    if (res.ok) {
      setModuleTitle("");
      setModuleDescription("");
      setModuleThumbnailUrl(null);
      setShowModuleForm(false);
      await refresh();
    }
  }

  async function updateModule(
    id: string,
    data: { title: string; description: string; thumbnailUrl: string | null },
  ) {
    await fetch(`/api/admin/training/modules/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    await refresh();
  }

  async function deleteModule(id: string) {
    if (!confirm("Delete this module and all of its lessons?")) return;
    await fetch(`/api/admin/training/modules/${id}`, { method: "DELETE" });
    await refresh();
  }

  async function moveModule(id: string, direction: "up" | "down") {
    await fetch(`/api/admin/training/modules/${id}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });
    await refresh();
  }

  async function createChapter(moduleId: string, title: string) {
    await fetch(`/api/admin/training/modules/${moduleId}/chapters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    setAddingChapterTo(null);
    await refresh();
  }

  async function updateChapterTitle(chapterId: string, title: string) {
    await fetch(`/api/admin/training/chapters/${chapterId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    await refresh();
  }

  async function deleteChapter(id: string) {
    if (!confirm("Delete this chapter and all of its lessons?")) return;
    await fetch(`/api/admin/training/chapters/${id}`, { method: "DELETE" });
    await refresh();
  }

  async function createLesson(chapterId: string, data: LessonInput) {
    await fetch(`/api/admin/training/chapters/${chapterId}/lessons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setAddingLessonTo(null);
    await refresh();
  }

  async function updateLesson(id: string, data: LessonInput) {
    await fetch(`/api/admin/training/lessons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    await refresh();
  }

  // Removes just the one video link or image — sends only that field, so
  // the rest of the lesson (title, description, other videos/photos) is
  // left untouched server-side, without going through the full edit form.
  async function removeLessonVideo(lesson: Lesson, videoId: string) {
    const videos = lesson.videos
      .filter((v) => v.id !== videoId)
      .map((v) => ({ url: v.url, thumbnailUrl: v.thumbnailUrl }));
    await fetch(`/api/admin/training/lessons/${lesson.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videos }),
    });
    await refresh();
  }

  async function removeLessonImage(lesson: Lesson, imageId: string) {
    const images = lesson.images
      .filter((img) => img.id !== imageId)
      .map((img) => img.url);
    await fetch(`/api/admin/training/lessons/${lesson.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images }),
    });
    await refresh();
  }

  async function deleteLesson(id: string) {
    if (!confirm("Delete this lesson?")) return;
    await fetch(`/api/admin/training/lessons/${id}`, { method: "DELETE" });
    await refresh();
  }

  // Moves an existing lesson into a different chapter — dropped at the end
  // of that chapter's lessons (server-side). Not optimistic like the
  // reorder handlers above: this changes which chapter's list the lesson
  // renders under at all, so a full refresh is simpler than hand-patching
  // two chapters' worth of nested state.
  async function moveLessonToChapter(lesson: Lesson, chapterId: string) {
    await fetch(`/api/admin/training/lessons/${lesson.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chapterId }),
    });
    await refresh();
  }

  // One drag handler for a module's whole chapter/lesson tree — dnd-kit's
  // own generated aria ids get out of sync between server and client
  // render when sortable lists each get their own nested DndContext, so
  // this module has exactly one DndContext with two nested SortableContext
  // levels instead (chapters, and each chapter's lessons) — this handler
  // disambiguates which level actually got dragged and reorders optimistically
  // (so the drop feels instant), then persists via the matching reorder
  // endpoint — same pattern as the Announcements drag-to-reorder list.
  async function handleModuleDragEnd(moduleId: string, event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const module_ = modules.find((m) => m.id === moduleId);
    if (!module_) return;

    const chapterIds = module_.chapters.map((c) => c.id);
    if (chapterIds.includes(String(active.id))) {
      const oldIndex = chapterIds.indexOf(String(active.id));
      const newIndex = chapterIds.indexOf(String(over.id));
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = [...module_.chapters];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);
      setModules((prev) =>
        prev.map((m) =>
          m.id === moduleId ? { ...m, chapters: reordered } : m,
        ),
      );
      await fetch(`/api/admin/training/modules/${moduleId}/chapters`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reorder: reordered.map((c) => c.id) }),
      });
      return;
    }

    const chapter = module_.chapters.find((c) =>
      c.lessons.some((l) => l.id === active.id),
    );
    if (!chapter || !chapter.lessons.some((l) => l.id === over.id)) return;
    const ids = chapter.lessons.map((l) => l.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = [...chapter.lessons];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    setModules((prev) =>
      prev.map((m) => ({
        ...m,
        chapters: m.chapters.map((c) =>
          c.id === chapter.id ? { ...c, lessons: reordered } : c,
        ),
      })),
    );
    await fetch(`/api/admin/training/chapters/${chapter.id}/lessons`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reorder: reordered.map((l) => l.id) }),
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Course Modules</CardTitle>
          <Button onClick={() => setShowModuleForm((s) => !s)}>
            {showModuleForm ? "Cancel" : "Add Module"}
          </Button>
        </CardHeader>

        {showModuleForm && (
          <div className="mb-4 space-y-2 rounded-lg border-copper-dim-gradient bg-surface2 p-3">
            <Input
              placeholder="Module title"
              value={moduleTitle}
              onChange={(e) => setModuleTitle(e.target.value)}
            />
            <TextArea
              placeholder="Description (optional)"
              value={moduleDescription}
              onChange={setModuleDescription}
            />
            <ThumbnailPicker
              url={moduleThumbnailUrl}
              onChange={setModuleThumbnailUrl}
            />
            <Button
              variant="secondary"
              disabled={!moduleTitle}
              onClick={createModule}
            >
              Create Module
            </Button>
          </div>
        )}

        <p className="text-sm text-muted">
          {modules.length === 0
            ? "No training modules yet. Add one above to start building your course."
            : "Agents see modules and lessons in this order."}
        </p>
      </Card>

      {modules.map((module_) => (
        <Card key={module_.id}>
          <CardHeader>
            {editingModuleId === module_.id ? (
              <div className="w-full space-y-2">
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
                <TextArea
                  value={editDescription}
                  onChange={setEditDescription}
                />
                <ThumbnailPicker
                  url={editThumbnailUrl}
                  onChange={setEditThumbnailUrl}
                />
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      await updateModule(module_.id, {
                        title: editTitle,
                        description: editDescription,
                        thumbnailUrl: editThumbnailUrl,
                      });
                      setEditingModuleId(null);
                    }}
                  >
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setEditingModuleId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex min-w-0 items-center gap-3">
                  {module_.thumbnailUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={module_.thumbnailUrl}
                      alt=""
                      className="h-12 w-20 shrink-0 rounded-md border border-border object-cover"
                    />
                  )}
                  <div className="min-w-0">
                    <CardTitle>{module_.title}</CardTitle>
                    {module_.description && (
                      <p className="mt-1 text-sm text-muted">
                        {module_.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    onClick={() => moveModule(module_.id, "up")}
                  >
                    ↑
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => moveModule(module_.id, "down")}
                  >
                    ↓
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEditingModuleId(module_.id);
                      setEditTitle(module_.title);
                      setEditDescription(module_.description ?? "");
                      setEditThumbnailUrl(module_.thumbnailUrl);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => deleteModule(module_.id)}
                  >
                    Delete
                  </Button>
                </div>
              </>
            )}
          </CardHeader>

          <div className="space-y-3">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event) => handleModuleDragEnd(module_.id, event)}
            >
              <SortableContext
                items={module_.chapters.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                {module_.chapters.map((chapter) => (
                  <ChapterRow
                    key={chapter.id}
                    chapter={chapter}
                    allChapters={module_.chapters.map((c) => ({
                      id: c.id,
                      title: c.title,
                    }))}
                    onUpdateTitle={(title) =>
                      updateChapterTitle(chapter.id, title)
                    }
                    onDelete={() => deleteChapter(chapter.id)}
                    onUpdateLesson={updateLesson}
                    onDeleteLesson={deleteLesson}
                    onMoveLessonToChapter={moveLessonToChapter}
                    onRemoveLessonVideo={removeLessonVideo}
                    onRemoveLessonImage={removeLessonImage}
                    addingLesson={addingLessonTo === chapter.id}
                    onStartAddLesson={() => setAddingLessonTo(chapter.id)}
                    onCancelAddLesson={() => setAddingLessonTo(null)}
                    onCreateLesson={(data) => createLesson(chapter.id, data)}
                  />
                ))}
              </SortableContext>
            </DndContext>
            {module_.chapters.length === 0 && (
              <p className="text-sm text-muted">
                No chapters in this module yet.
              </p>
            )}
          </div>

          <div className="mt-3">
            {addingChapterTo === module_.id ? (
              <ChapterForm
                onSubmit={(title) => createChapter(module_.id, title)}
                onCancel={() => setAddingChapterTo(null)}
              />
            ) : (
              <Button
                variant="secondary"
                onClick={() => setAddingChapterTo(module_.id)}
              >
                + Add Chapter
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
