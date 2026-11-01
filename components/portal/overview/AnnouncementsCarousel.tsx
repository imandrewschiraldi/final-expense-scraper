"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { upload } from "@vercel/blob/client";
import { useSession } from "next-auth/react";
import { Download, Pause, Play, Plus, Settings, Trash2, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { optimizableImageUrl } from "@/lib/profileImage";
import { youtubeThumbnailUrl } from "@/lib/youtube";
import { generateVideoThumbnail, generatePdfThumbnail } from "@/lib/clientThumbnail";

type AnnouncementType = "VIDEO" | "IMAGE" | "UPLOADED_VIDEO" | "PDF";
type Item = { id: string; type: AnnouncementType; title: string; url: string; thumbnailUrl?: string | null; active?: boolean };

const CARD_WIDTH = 280;
const CARD_HEIGHT = 158;
const CARD_GAP = 9;
const STEP = CARD_WIDTH + CARD_GAP;
// Pixels per second of continuous auto-scroll — tuned to read as a steady
// drift rather than either a jump or a crawl.
const SCROLL_SPEED = 40;

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="font-condensed absolute top-2 left-2 rounded px-1.5 py-0.5 text-[9px] font-extrabold tracking-wide text-black uppercase"
      style={{ background: "var(--copper-metal-hi)" }}
    >
      {children}
    </span>
  );
}

function Thumbnail({ item, onOpen }: { item: Item; onOpen: () => void }) {
  if (item.type === "VIDEO" || item.type === "UPLOADED_VIDEO") {
    const thumb = item.type === "VIDEO" ? youtubeThumbnailUrl(item.url) : item.thumbnailUrl;
    return (
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block w-full overflow-hidden rounded-[10px] border border-border bg-surface2"
        style={{ height: CARD_HEIGHT }}
        title={item.title}
      >
        {thumb && (
          // A fixed-size YouTube thumbnail or a locally-generated video
          // frame, not a user-controlled remote image — no crash risk from
          // an oversized source, so a plain <img> is fine here.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="h-full w-full object-cover" />
        )}
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55">
            <Play className="h-4.5 w-4.5 translate-x-0.5 fill-white text-white" />
          </span>
        </span>
        <Badge>Video</Badge>
      </a>
    );
  }

  if (item.type === "PDF") {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onOpen();
        }}
        className="relative w-full cursor-pointer overflow-hidden rounded-[10px] border border-border bg-surface2"
        style={{ height: CARD_HEIGHT }}
        title={item.title}
      >
        {item.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted">
            <FileText className="h-8 w-8" />
          </div>
        )}
        <Badge>PDF</Badge>
        <a
          href={item.url}
          download
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Download ${item.title}`}
          onClick={(e) => e.stopPropagation()}
          className="absolute right-2 bottom-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
        >
          <Download className="h-3.5 w-3.5" />
        </a>
      </div>
    );
  }

  const src = optimizableImageUrl(item.url);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen();
      }}
      className="relative w-full cursor-pointer overflow-hidden rounded-[10px] border border-border bg-surface2"
      style={{ height: CARD_HEIGHT }}
      title={item.title}
    >
      {src ? (
        <Image src={src} alt="" fill sizes="280px" className="object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs text-muted">Image unavailable</div>
      )}
      <a
        href={item.url}
        download
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Download ${item.title}`}
        onClick={(e) => e.stopPropagation()}
        className="absolute right-2 bottom-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
      >
        <Download className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}

/** Full-size preview of a downloadable Announcements item — an enlarged
 *  image, or the actual PDF rendered in an iframe (the browser's own PDF
 *  viewer, not just the first-page thumbnail blown up) — with a download
 *  link alongside, not instead of, the small per-card one. */
function Lightbox({ item, onClose }: { item: Item; onClose: () => void }) {
  const src = item.type === "IMAGE" ? (optimizableImageUrl(item.url) ?? item.url) : item.url;
  return (
    <Modal open onClose={onClose} title={item.title} maxWidthClassName="max-w-4xl">
      <div className="space-y-4">
        {item.type === "PDF" ? (
          <iframe src={item.url} title={item.title} className="h-[75vh] w-full rounded-lg border border-border bg-white" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={item.title} className="max-h-[75vh] w-full rounded-lg object-contain" />
        )}
        <a
          href={item.url}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="font-condensed inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-teal-light uppercase hover:underline"
        >
          <Download className="h-3.5 w-3.5" />
          Download
        </a>
      </div>
    </Modal>
  );
}

/** Uploads one admin-picked file straight to Blob storage (bypassing this
 *  app's own server entirely) and hands back its public URL. */
async function uploadAnnouncementFile(file: File, kind: "image" | "video" | "pdf") {
  const blob = await upload(file.name, file, {
    access: "public",
    handleUploadUrl: "/api/admin/announcements/upload",
    clientPayload: JSON.stringify({ kind }),
  });
  return blob.url;
}

function AdminManageModal({ onClose, onChanged }: { onClose: () => void; onChanged: () => void }) {
  const [items, setItems] = useState<(Item & { active: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<AnnouncementType>("VIDEO");
  const [title, setTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string | null>(null);
  const [generatingThumbnail, setGeneratingThumbnail] = useState(false);
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

  async function onFilePicked(picked: File | null) {
    setFile(picked);
    setThumbnailDataUrl(null);
    setError(null);
    if (!picked || (type !== "UPLOADED_VIDEO" && type !== "PDF")) return;
    setGeneratingThumbnail(true);
    try {
      const dataUrl = type === "UPLOADED_VIDEO" ? await generateVideoThumbnail(picked) : await generatePdfThumbnail(picked);
      setThumbnailDataUrl(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't generate a thumbnail for that file.");
      setFile(null);
    } finally {
      setGeneratingThumbnail(false);
    }
  }

  async function addItem() {
    setError(null);
    if (!title.trim()) return setError("Give it a title.");
    setSaving(true);
    try {
      let url = "";
      let thumbnailUrl: string | null = null;

      if (type === "VIDEO") {
        url = videoUrl.trim();
        if (!url) {
          setError("Paste a YouTube link.");
          return;
        }
      } else if (type === "IMAGE") {
        if (!file) {
          setError("Choose an image.");
          return;
        }
        url = await uploadAnnouncementFile(file, "image");
      } else {
        if (!file || !thumbnailDataUrl) {
          setError(type === "UPLOADED_VIDEO" ? "Choose a video." : "Choose a PDF.");
          return;
        }
        url = await uploadAnnouncementFile(file, type === "UPLOADED_VIDEO" ? "video" : "pdf");
        thumbnailUrl = thumbnailDataUrl;
      }

      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, title: title.trim(), url, thumbnailUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to add.");
        return;
      }
      setTitle("");
      setVideoUrl("");
      setFile(null);
      setThumbnailDataUrl(null);
      load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
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

  const fileAccept =
    type === "IMAGE" ? "image/png,image/jpeg,image/gif,image/webp" : type === "UPLOADED_VIDEO" ? "video/mp4,video/webm,video/quicktime" : "application/pdf";

  return (
    <Modal open onClose={onClose} title="Manage Announcements" maxWidthClassName="max-w-lg">
      <div className="space-y-5">
        <div className="space-y-3 rounded-lg border border-border p-4">
          <Select
            value={type}
            onChange={(e) => {
              setType(e.target.value as AnnouncementType);
              setFile(null);
              setThumbnailDataUrl(null);
              setError(null);
            }}
          >
            <option value="VIDEO">YouTube Video</option>
            <option value="UPLOADED_VIDEO">Uploaded Video</option>
            <option value="IMAGE">Downloadable Image</option>
            <option value="PDF">PDF Document</option>
          </Select>
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          {type === "VIDEO" ? (
            <Input placeholder="https://youtube.com/watch?v=..." value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
          ) : (
            <>
              <input
                type="file"
                accept={fileAccept}
                onChange={(e) => onFilePicked(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-surface2 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-foreground"
              />
              {type === "UPLOADED_VIDEO" && <p className="text-xs text-muted">Up to 300MB.</p>}
              {generatingThumbnail && <p className="text-xs text-muted">Generating thumbnail...</p>}
              {thumbnailDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbnailDataUrl} alt="" className="h-20 w-auto rounded border border-border object-cover" />
              )}
            </>
          )}
          {error && <p className="text-sm text-red-light">{error}</p>}
          <Button onClick={addItem} disabled={saving || generatingThumbnail} className="w-full">
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
                  {item.type.replace("_", " ")}
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
  const [hovering, setHovering] = useState(false);
  const [managing, setManaging] = useState(false);
  const [lightbox, setLightbox] = useState<Item | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  // Last animation-frame timestamp — null whenever the drift isn't actively
  // running (paused, hovered, or just (re)started), so the first frame
  // after resuming measures a fresh elapsed time instead of counting the
  // whole idle gap as a jump.
  const lastTickRef = useRef<number | null>(null);

  function load() {
    fetch("/api/portal/announcements")
      .then((res) => res.json())
      .then((data) => setItems(data.items ?? []))
      .catch(() => setItems([]));
  }

  useEffect(() => {
    load();
  }, []);

  // A continuous right-to-left drift, not periodic jumps — one set of
  // slides is rendered twice back to back, and once the scroll position
  // passes the first copy it's snapped back by exactly that copy's width
  // (identical content on both sides of the snap, so it's imperceptible),
  // which is what makes it loop forever instead of bouncing at the end.
  useEffect(() => {
    if (items.length === 0) return;
    let raf = 0;
    const setWidth = items.length * STEP;

    function tick(ts: number) {
      const el = scrollerRef.current;
      const running = el && !paused && !hovering && !lightbox;
      if (running) {
        if (lastTickRef.current !== null) {
          el.scrollLeft += SCROLL_SPEED * ((ts - lastTickRef.current) / 1000);
          if (el.scrollLeft >= setWidth) el.scrollLeft -= setWidth;
        }
        lastTickRef.current = ts;
      } else {
        lastTickRef.current = null;
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused, hovering, lightbox, items.length]);

  function step(dir: 1 | -1) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollLeft += dir * STEP;
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
        <div
          ref={scrollerRef}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          className="flex overflow-x-auto pb-1"
          style={{ scrollbarWidth: "none", gap: CARD_GAP }}
        >
          {[...items, ...items].map((item, i) => (
            <div key={`${item.id}-${i}`} className="shrink-0" style={{ width: CARD_WIDTH }}>
              <Thumbnail
                item={item}
                onOpen={() => {
                  if (item.type === "IMAGE" || item.type === "PDF") setLightbox(item);
                }}
              />
            </div>
          ))}
        </div>
      )}

      {managing && <AdminManageModal onClose={() => setManaging(false)} onChanged={load} />}
      {lightbox && <Lightbox item={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}
