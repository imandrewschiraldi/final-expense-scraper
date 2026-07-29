"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { format } from "date-fns";

type Resource = {
  id: string;
  title: string;
  description: string | null;
  fileUrl: string;
  createdAt: string;
  uploadedBy: { name: string } | null;
};

export function ResourcesPanel({ initialResources, isAdmin }: { initialResources: Resource[]; isAdmin: boolean }) {
  const [resources, setResources] = useState(initialResources);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload() {
    if (!title.trim() || !file) {
      setError("Title and a file are both required");
      return;
    }
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.set("title", title.trim());
    formData.set("description", description.trim());
    formData.set("file", file);

    const res = await fetch("/api/portal/resources", { method: "POST", body: formData });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) {
      setError(data.error ?? "Upload failed");
      return;
    }
    setResources((prev) => [data.resource, ...prev]);
    setShowForm(false);
    setTitle("");
    setDescription("");
    setFile(null);
  }

  async function remove(id: string) {
    if (!window.confirm("Remove this resource?")) return;
    const res = await fetch(`/api/portal/resources/${id}`, { method: "DELETE" });
    if (res.ok) {
      setResources((prev) => prev.filter((r) => r.id !== id));
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Resources</CardTitle>
          {isAdmin && <Button onClick={() => setShowForm((s) => !s)}>{showForm ? "Cancel" : "Upload Resource"}</Button>}
        </CardHeader>
        <p className="mb-4 text-sm text-muted">Reference sheets and other useful files, available for anyone to download.</p>

        {isAdmin && showForm && (
          <div className="mb-6 space-y-3 rounded-[10px] border border-copper-dim bg-surface2 p-4">
            <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <textarea
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-16 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-copper-dim focus:outline-none"
            />
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-muted"
            />
            {error && <p className="text-sm text-red-light">{error}</p>}
            <Button onClick={upload} disabled={uploading}>
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        )}

        <div className="space-y-3">
          {resources.length === 0 && <p className="text-sm text-muted">No resources uploaded yet.</p>}
          {resources.map((resource) => (
            <div key={resource.id} className="flex items-start justify-between gap-3 rounded-[10px] border border-border bg-surface p-4">
              <div>
                <a
                  href={resource.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-condensed text-lg font-extrabold text-copper uppercase hover:underline"
                >
                  {resource.title}
                </a>
                {resource.description && <p className="mt-1 text-sm text-muted">{resource.description}</p>}
                <p className="mt-1 text-xs text-muted">
                  {resource.uploadedBy?.name ?? "Unknown"} &middot; {format(new Date(resource.createdAt), "MMM d, yyyy")}
                </p>
              </div>
              {isAdmin && (
                <Button variant="danger" onClick={() => remove(resource.id)}>
                  Remove
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
