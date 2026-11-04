"use client";

import { useState } from "react";
import { upload } from "@vercel/blob/client";
import { ImagePlus, Upload, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  TRAINING_IMAGE_MAX_BYTES,
  TRAINING_IMAGE_TYPES,
  TRAINING_VIDEO_MAX_BYTES,
  TRAINING_VIDEO_TYPES,
} from "@/lib/training";

type LessonImage = { id: string; url: string };
type LessonVideo = { id: string; url: string };

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
  videos: string[];
  images: string[];
};

type Module = {
  id: string;
  title: string;
  description: string | null;
  order: number;
  lessons: Lesson[];
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

/** One video link — paste one (YouTube/Vimeo/Loom/a direct video file
 *  link), or upload a file straight from this device when there's no
 *  hosted link at all. An upload goes directly from the browser to Blob
 *  storage (see app/api/admin/training/video/route.ts) and simply fills
 *  in this same field with the resulting URL. A lesson can hold several
 *  of these — see VideoUrlList below. */
function VideoUrlField({
  value,
  onChange,
  onRemove,
  placeholder,
}: {
  value: string;
  onChange: (url: string) => void;
  onRemove: () => void;
  placeholder: string;
}) {
  const [uploading, setUploading] = useState(false);
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
      setError(`${file.name} is too large (300MB max).`);
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/admin/training/video",
      });
      onChange(blob.url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "That video didn't upload.",
      );
    } finally {
      setUploading(false);
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
        <div className="flex-1">
          <Input
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
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
          {uploading ? "Uploading..." : "Upload"}
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
      <p className="text-[11px] text-muted">
        Or drag and drop a video file here.
      </p>
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
  videos: string[];
  onChange: (urls: string[]) => void;
}) {
  const rows = videos.length > 0 ? videos : [""];
  return (
    <div className="space-y-2">
      {rows.map((url, i) => (
        <VideoUrlField
          key={i}
          value={url}
          placeholder={
            i === 0
              ? "Video URL (YouTube, Vimeo, Loom, or a direct video file link) — optional if you add photos"
              : "Another link (e.g. a YouTube channel to follow) — optional"
          }
          onChange={(v) => onChange(rows.map((u, idx) => (idx === i ? v : u)))}
          onRemove={() => onChange(rows.filter((_, idx) => idx !== i))}
        />
      ))}
      <Button variant="ghost" onClick={() => onChange([...rows, ""])}>
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
  const [videos, setVideos] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const canSubmit =
    title.trim() !== "" &&
    (videos.some((v) => v.trim() !== "") || images.length > 0);

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
  onUpdate,
  onDelete,
  onMove,
  onRemoveVideo,
  onRemoveImage,
}: {
  lesson: Lesson;
  onUpdate: (id: string, data: LessonInput) => Promise<void>;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onRemoveVideo: (videoId: string) => Promise<void>;
  onRemoveImage: (imageId: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(lesson.title);
  const [description, setDescription] = useState(lesson.description ?? "");
  const [videos, setVideos] = useState(lesson.videos.map((v) => v.url));
  const [images, setImages] = useState(lesson.images.map((img) => img.url));
  const [saving, setSaving] = useState(false);
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

  const canSubmit =
    title.trim() !== "" &&
    (videos.some((v) => v.trim() !== "") || images.length > 0);

  if (editing) {
    return (
      <div className="space-y-2 rounded-lg border-copper-dim-gradient bg-surface2 p-3">
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
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-surface2 p-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white">{lesson.title}</p>
        {lesson.description && (
          <p className="mt-1 text-xs text-muted">{lesson.description}</p>
        )}
        {lesson.videos.map((v) => (
          <div key={v.id} className="mt-1 flex items-center gap-1.5">
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
      <div className="flex shrink-0 gap-1">
        <Button variant="ghost" onClick={() => onMove(lesson.id, "up")}>
          ↑
        </Button>
        <Button variant="ghost" onClick={() => onMove(lesson.id, "down")}>
          ↓
        </Button>
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

export function TrainingPanel({
  initialModules,
}: {
  initialModules: Module[];
}) {
  const [modules, setModules] = useState(initialModules);
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleDescription, setModuleDescription] = useState("");
  const [addingLessonTo, setAddingLessonTo] = useState<string | null>(null);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

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
      }),
    });
    if (res.ok) {
      setModuleTitle("");
      setModuleDescription("");
      setShowModuleForm(false);
      await refresh();
    }
  }

  async function updateModule(
    id: string,
    data: { title: string; description: string },
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

  async function createLesson(moduleId: string, data: LessonInput) {
    await fetch(`/api/admin/training/modules/${moduleId}/lessons`, {
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
      .map((v) => v.url);
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

  async function moveLesson(id: string, direction: "up" | "down") {
    await fetch(`/api/admin/training/lessons/${id}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });
    await refresh();
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
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      await updateModule(module_.id, {
                        title: editTitle,
                        description: editDescription,
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
                <div>
                  <CardTitle>{module_.title}</CardTitle>
                  {module_.description && (
                    <p className="mt-1 text-sm text-muted">
                      {module_.description}
                    </p>
                  )}
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

          <div className="space-y-2">
            {module_.lessons.map((lesson) => (
              <LessonRow
                key={lesson.id}
                lesson={lesson}
                onUpdate={updateLesson}
                onDelete={deleteLesson}
                onMove={moveLesson}
                onRemoveVideo={(videoId) => removeLessonVideo(lesson, videoId)}
                onRemoveImage={(imageId) => removeLessonImage(lesson, imageId)}
              />
            ))}
            {module_.lessons.length === 0 && (
              <p className="text-sm text-muted">
                No lessons in this module yet.
              </p>
            )}
          </div>

          <div className="mt-3">
            {addingLessonTo === module_.id ? (
              <LessonForm
                onSubmit={(data) => createLesson(module_.id, data)}
                onCancel={() => setAddingLessonTo(null)}
              />
            ) : (
              <Button
                variant="secondary"
                onClick={() => setAddingLessonTo(module_.id)}
              >
                Add Lesson
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
