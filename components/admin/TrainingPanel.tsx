"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";

type Lesson = {
  id: string;
  title: string;
  description: string | null;
  videoUrl: string;
  order: number;
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
      className="min-h-16 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-copper-dim focus:outline-none"
    />
  );
}

function LessonForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: { title: string; description: string; videoUrl: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-2 rounded-lg border border-copper-dim bg-surface2 p-3">
      <Input placeholder="Lesson title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Input
        placeholder="Video URL (YouTube, Vimeo, or Loom)"
        value={videoUrl}
        onChange={(e) => setVideoUrl(e.target.value)}
      />
      <TextArea placeholder="Description (optional)" value={description} onChange={setDescription} />
      <div className="flex gap-2">
        <Button
          variant="secondary"
          disabled={loading || !title || !videoUrl}
          onClick={async () => {
            setLoading(true);
            await onSubmit({ title, description, videoUrl });
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
}: {
  lesson: Lesson;
  onUpdate: (id: string, data: { title: string; description: string; videoUrl: string }) => Promise<void>;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(lesson.title);
  const [description, setDescription] = useState(lesson.description ?? "");
  const [videoUrl, setVideoUrl] = useState(lesson.videoUrl);
  const [saving, setSaving] = useState(false);

  if (editing) {
    return (
      <div className="space-y-2 rounded-lg border border-copper-dim bg-surface2 p-3">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
        <TextArea value={description} onChange={setDescription} />
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              await onUpdate(lesson.id, { title, description, videoUrl });
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
      <div>
        <p className="text-sm font-semibold text-white">{lesson.title}</p>
        {lesson.description && <p className="mt-1 text-xs text-muted">{lesson.description}</p>}
        <p className="mt-1 truncate text-xs text-teal-light">{lesson.videoUrl}</p>
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

export function TrainingPanel({ initialModules }: { initialModules: Module[] }) {
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
      body: JSON.stringify({ title: moduleTitle, description: moduleDescription }),
    });
    if (res.ok) {
      setModuleTitle("");
      setModuleDescription("");
      setShowModuleForm(false);
      await refresh();
    }
  }

  async function updateModule(id: string, data: { title: string; description: string }) {
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

  async function createLesson(moduleId: string, data: { title: string; description: string; videoUrl: string }) {
    await fetch(`/api/admin/training/modules/${moduleId}/lessons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setAddingLessonTo(null);
    await refresh();
  }

  async function updateLesson(id: string, data: { title: string; description: string; videoUrl: string }) {
    await fetch(`/api/admin/training/lessons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
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
          <Button onClick={() => setShowModuleForm((s) => !s)}>{showModuleForm ? "Cancel" : "Add Module"}</Button>
        </CardHeader>

        {showModuleForm && (
          <div className="mb-4 space-y-2 rounded-lg border border-copper-dim bg-surface2 p-3">
            <Input placeholder="Module title" value={moduleTitle} onChange={(e) => setModuleTitle(e.target.value)} />
            <TextArea
              placeholder="Description (optional)"
              value={moduleDescription}
              onChange={setModuleDescription}
            />
            <Button variant="secondary" disabled={!moduleTitle} onClick={createModule}>
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
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                <TextArea value={editDescription} onChange={setEditDescription} />
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      await updateModule(module_.id, { title: editTitle, description: editDescription });
                      setEditingModuleId(null);
                    }}
                  >
                    Save
                  </Button>
                  <Button variant="ghost" onClick={() => setEditingModuleId(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <CardTitle>{module_.title}</CardTitle>
                  {module_.description && <p className="mt-1 text-sm text-muted">{module_.description}</p>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" onClick={() => moveModule(module_.id, "up")}>
                    ↑
                  </Button>
                  <Button variant="ghost" onClick={() => moveModule(module_.id, "down")}>
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
                  <Button variant="danger" onClick={() => deleteModule(module_.id)}>
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
              />
            ))}
            {module_.lessons.length === 0 && <p className="text-sm text-muted">No lessons in this module yet.</p>}
          </div>

          <div className="mt-3">
            {addingLessonTo === module_.id ? (
              <LessonForm
                onSubmit={(data) => createLesson(module_.id, data)}
                onCancel={() => setAddingLessonTo(null)}
              />
            ) : (
              <Button variant="secondary" onClick={() => setAddingLessonTo(module_.id)}>
                Add Lesson
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
