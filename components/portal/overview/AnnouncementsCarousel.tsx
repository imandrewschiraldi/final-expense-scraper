"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { Download, Pause, Play, Plus, Settings, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { optimizableImageUrl } from "@/lib/profileImage";
import { youtubeThumbnailUrl } from "@/lib/youtube";

type Item = { id: string; type: "VIDEO" | "IMAGE"; title: string; url: string; active?: boolean };

const CARD_WIDTH = 236;
const CARD_GAP = 18;
const STEP = CARD_WIDTH + CARD_GAP;
const AUTO_ADVANCE_MS = 4500;

function Thumbnail({ item }: { item: Item }) {
  if (item.type === "VIDEO") {
    const thumb = youtubeThumbnailUrl(item.url);
    return (
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block h-[133px] w-full overflow-hidden rounded-[10px] border border-border bg-surface2"
        title={item.title}
      >
        {thumb && (
          // Fixed-size YouTube thumbnail, not a user upload — no crash risk
          // from an oversized source, so a plain <img> is fine here.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="h-full w-full object-cover" />
        )}
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55">
            <Play className="h-4.5 w-4.5 translate-x-0.5 fill-white text-white" />
          </span>
        </span>
        <span className="font-condensed absolute top-2 left-2 rounded px-1.5 py-0.5 text-[9px] font-extrabold tracking-wide text-black uppercase" style={{ background: "var(--copper-metal-hi)" }}>
          Video
        </span>
      </a>
    );
  }

  const src = optimizableImageUrl(item.url);
  return (
    <div className="relative h-[133px] w-full overflow-hidden rounded-[10px] border border-border bg-surface2">
      {src ? (
        <Image src={src} alt="" fill sizes="236px" className="object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs text-muted">Image unavailable</div>
      )}
      <a
        href={item.url}
        download
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Download ${item.title}`}
        className="absolute right-2 bottom-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
      >
        <Download className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}

function AdminManageModal({ onClose, onChanged }: { onClose: () => void; onChanged: () => void }) {
  const [items, setItems] = useState<(Item & { active: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<"VIDEO" | "IMAGE">("VIDEO");
  const [title, setTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/admin/announcements")
      .then((res) => res.json())
      .then((data) => setItems(data.items ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function addItem() {
    setError(null);
    if (!title.trim()) return setError("Give it a title.");
    setSaving(true);
    try {
      let url = videoUrl.trim();
      if (type === "IMAGE") {
        if (!file) {
          setError("Choose an image.");
          return;
        }
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await fetch("/api/admin/announcements/upload", { method: "POST", body: formData });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          setError(uploadData.error ?? "Upload failed.");
          return;
        }
        url = uploadData.url;
      } else if (!url) {
        setError("Paste a YouTube link.");
        return;
      }

      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, title: title.trim(), url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to add.");
        return;
      }
      setTitle("");
      setVideoUrl("");
      setFile(null);
      load();
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch("/api/admin/announcements", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active }),
    });
    load();
    onChanged();
  }

  async function removeItem(id: string) {
    await fetch("/api/admin/announcements", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
    onChanged();
  }

  return (
    <Modal open onClose={onClose} title="Manage Announcements" maxWidthClassName="max-w-lg">
      <div className="space-y-5">
        <div className="space-y-3 rounded-lg border border-border p-4">
          <div className="flex gap-2">
            <Select value={type} onChange={(e) => setType(e.target.value as "VIDEO" | "IMAGE")} className="w-36 shrink-0">
              <option value="VIDEO">YouTube Video</option>
              <option value="IMAGE">Downloadable Image</option>
            </Select>
            <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          {type === "VIDEO" ? (
            <Input placeholder="https://youtube.com/watch?v=..." value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
          ) : (
            <input
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-surface2 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-foreground"
            />
          )}
          {error && <p className="text-sm text-red-light">{error}</p>}
          <Button onClick={addItem} disabled={saving} className="w-full">
            <Plus className="size-4" />
            {saving ? "Adding..." : "Add Slide"}
          </Button>
        </div>

        <div className="space-y-2">
          {loading ? (
            <p className="text-sm text-muted">Loading...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted">No slides yet.</p>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
                <span className="font-condensed shrink-0 rounded px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide text-muted uppercase" style={{ border: "1px solid var(--border)" }}>
                  {item.type}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">{item.title}</span>
                <button
                  type="button"
                  onClick={() => toggleActive(item.id, !item.active)}
                  className="font-condensed shrink-0 text-[11px] font-bold tracking-wide uppercase text-teal-light hover:underline"
                >
                  {item.active ? "Hide" : "Show"}
                </button>
                <button type="button" onClick={() => removeItem(item.id)} aria-label="Delete" className="shrink-0 text-muted hover:text-red-light">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}

export function AnnouncementsCarousel() {
  const { data: session } = useSession();
  const isAdmin = session?.user.role === "ADMIN";

  const [items, setItems] = useState<Item[]>([]);
  const [paused, setPaused] = useState(false);
  const [managing, setManaging] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  function load() {
    fetch("/api/portal/announcements")
      .then((res) => res.json())
      .then((data) => setItems(data.items ?? []))
      .catch(() => setItems([]));
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (paused || items.length === 0) return;
    const interval = setInterval(() => {
      const el = scrollerRef.current;
      if (!el) return;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      el.scrollTo({ left: atEnd ? 0 : el.scrollLeft + STEP, behavior: "smooth" });
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(interval);
  }, [paused, items.length]);

  function step(dir: 1 | -1) {
    scrollerRef.current?.scrollBy({ left: dir * STEP, behavior: "smooth" });
  }

  if (items.length === 0 && !isAdmin) return null;

  return (
    <div data-tour="announcements-carousel" className="mb-9">
      <div className="mb-3.5 flex items-center justify-between">
        <h2 className="font-condensed text-[17px] font-extrabold tracking-wide text-white uppercase">Announcements</h2>
        <div className="flex items-center gap-1.5">
          {isAdmin && (
            <button
              type="button"
              onClick={() => setManaging(true)}
              aria-label="Manage announcements"
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface2 hover:text-foreground"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
          )}
          {items.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                aria-label={paused ? "Resume auto-scroll" : "Pause auto-scroll"}
                className="flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface2 hover:text-foreground"
              >
                {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Previous"
                className="flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface2 hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next"
                className="flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface2 hover:text-foreground"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted">No announcements yet — add one from the gear icon above.</p>
      ) : (
        <div ref={scrollerRef} className="flex gap-[18px] overflow-x-auto scroll-smooth pb-1" style={{ scrollbarWidth: "none" }}>
          {items.map((item) => (
            <div key={item.id} className="shrink-0" style={{ width: CARD_WIDTH }}>
              <Thumbnail item={item} />
              <p className="mt-2 line-clamp-1 text-[13px] font-semibold text-foreground">{item.title}</p>
            </div>
          ))}
        </div>
      )}

      {managing && <AdminManageModal onClose={() => setManaging(false)} onChanged={load} />}
    </div>
  );
}
