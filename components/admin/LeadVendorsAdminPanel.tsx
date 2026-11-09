"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { upload } from "@vercel/blob/client";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

type Vendor = {
  id: string;
  name: string;
  description: string | null;
  bullets: string[];
  url: string;
  logoUrl: string;
  logoOnLight: boolean;
};

/** Uploads an admin-picked logo straight to Blob storage, reusing the same
 *  generic image-upload route the Announcements admin flow already uses. */
async function uploadLogo(file: File) {
  const blob = await upload(file.name, file, {
    access: "public",
    handleUploadUrl: "/api/admin/announcements/upload",
    clientPayload: JSON.stringify({ kind: "image" }),
  });
  return blob.url;
}

function VendorForm({
  vendor,
  onClose,
  onSaved,
}: {
  vendor: Vendor | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = vendor !== null;
  const [name, setName] = useState(vendor?.name ?? "");
  const [description, setDescription] = useState(vendor?.description ?? "");
  const [bulletsText, setBulletsText] = useState(
    (vendor?.bullets ?? []).join("\n"),
  );
  const [url, setUrl] = useState(vendor?.url ?? "");
  const [logoUrl, setLogoUrl] = useState(vendor?.logoUrl ?? "");
  const [logoOnLight, setLogoOnLight] = useState(vendor?.logoOnLight ?? false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFilePicked(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      setLogoUrl(await uploadLogo(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logo upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setError(null);
    if (!name.trim()) return setError("Give it a name.");
    if (!url.trim()) return setError("A URL is required.");
    if (!logoUrl) return setError("Upload a logo.");

    setSaving(true);
    try {
      const bullets = bulletsText
        .split("\n")
        .map((b) => b.trim())
        .filter(Boolean);
      const body = {
        name: name.trim(),
        description: description.trim(),
        bullets,
        url: url.trim(),
        logoUrl,
        logoOnLight,
      };
      const res = await fetch(
        isEdit
          ? `/api/admin/lead-vendors/${vendor.id}`
          : "/api/admin/lead-vendors",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
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
      title={isEdit ? "Edit Vendor" : "Add Vendor"}
      maxWidthClassName="max-w-lg"
    >
      <div className="space-y-3">
        <Input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          placeholder="https://example.com/"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <Input
          placeholder="Short description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <textarea
          placeholder="Bullet points — one per line (optional)"
          value={bulletsText}
          onChange={(e) => setBulletsText(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-copper-focus-gradient bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none"
        />

        <div className="space-y-2 rounded-lg border border-border p-3">
          <div className="flex items-center gap-3">
            {logoUrl && (
              <span
                className={
                  logoOnLight
                    ? "flex h-10 w-20 items-center justify-center rounded-full bg-white"
                    : "flex h-10 w-20 items-center justify-center"
                }
              >
                <Image
                  src={logoUrl}
                  alt=""
                  width={160}
                  height={40}
                  className="h-8 w-auto object-contain"
                  unoptimized
                />
              </span>
            )}
            <input
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              onChange={(e) => onFilePicked(e.target.files?.[0] ?? null)}
              className="min-w-0 flex-1 text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-surface2 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-foreground"
            />
          </div>
          {uploading && <p className="text-xs text-muted">Uploading...</p>}
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={logoOnLight}
              onChange={(e) => setLogoOnLight(e.target.checked)}
              className="h-4 w-4"
            />
            Put logo on a white chip (for logos with a light background)
          </label>
        </div>

        {error && <p className="text-sm text-red-light">{error}</p>}
        <Button
          onClick={save}
          disabled={saving || uploading}
          className="w-full"
        >
          {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Vendor"}
        </Button>
      </div>
    </Modal>
  );
}

function VendorRow({
  vendor,
  onEdit,
  onDeleted,
}: {
  vendor: Vendor;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  async function remove() {
    if (!confirm(`Remove ${vendor.name}?`)) return;
    await fetch(`/api/admin/lead-vendors/${vendor.id}`, { method: "DELETE" });
    onDeleted();
  }

  return (
    <Card className="flex items-center gap-4">
      <span
        className={
          vendor.logoOnLight
            ? "flex h-10 w-20 shrink-0 items-center justify-center rounded-full bg-white"
            : "flex h-10 w-20 shrink-0 items-center justify-center"
        }
      >
        <Image
          src={vendor.logoUrl}
          alt={vendor.name}
          width={160}
          height={40}
          className="h-8 w-auto object-contain"
          unoptimized
        />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-white">{vendor.name}</p>
        {vendor.description && (
          <p className="truncate text-xs text-muted">{vendor.description}</p>
        )}
      </div>
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
        aria-label="Delete"
        className="shrink-0 text-muted hover:text-red-light"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </Card>
  );
}

export function LeadVendorsAdminPanel() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Vendor | "new" | null>(null);

  function load() {
    fetch("/api/admin/lead-vendors")
      .then((res) => res.json())
      .then((data) => setVendors(data.vendors ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <Button onClick={() => setEditing("new")}>
        <Plus className="size-4" />
        Add Vendor
      </Button>

      {loading ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : vendors.length === 0 ? (
        <p className="text-sm text-muted">No vendors yet — add one above.</p>
      ) : (
        <div className="space-y-2">
          {vendors.map((vendor) => (
            <VendorRow
              key={vendor.id}
              vendor={vendor}
              onEdit={() => setEditing(vendor)}
              onDeleted={load}
            />
          ))}
        </div>
      )}

      {editing && (
        <VendorForm
          vendor={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
