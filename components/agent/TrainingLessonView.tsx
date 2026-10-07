"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { getEmbedUrl } from "@/lib/videoEmbed";
import { blobDownloadUrl } from "@/lib/training";

type Lesson = {
  id: string;
  title: string;
  description: string | null;
  videoUrl: string | null;
  images: { id: string; url: string }[];
  moduleTitle: string;
};

type Navigation = {
  prevId: string | null;
  nextId: string | null;
  position: number | null;
  total: number;
};

export function TrainingLessonView({
  lesson,
  isCompleted: initialCompleted,
  navigation,
}: {
  lesson: Lesson;
  isCompleted: boolean;
  navigation: Navigation;
}) {
  const router = useRouter();
  const [completed, setCompleted] = useState(initialCompleted);
  const [saving, setSaving] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const prevHref = navigation.prevId ? `/agent/training/lessons/${navigation.prevId}` : null;
  const nextHref = navigation.nextId ? `/agent/training/lessons/${navigation.nextId}` : null;
  const embedUrl = lesson.videoUrl ? getEmbedUrl(lesson.videoUrl) : null;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      if (e.key === "ArrowLeft" && prevHref) router.push(prevHref);
      else if (e.key === "ArrowRight" && nextHref) router.push(nextHref);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [prevHref, nextHref, router]);

  async function toggleComplete() {
    setSaving(true);
    await fetch(`/api/agent/training/lessons/${lesson.id}/complete`, {
      method: completed ? "DELETE" : "POST",
    });
    setCompleted(!completed);
    setSaving(false);
    router.refresh();
  }

  // Triggers a download per photo via throwaway <a download> elements
  // (Blob's downloadUrl form sets Content-Disposition: attachment, so this
  // downloads rather than opening a new tab). Staggered slightly since
  // browsers can silently drop download clicks fired in the same tick.
  function downloadImages() {
    lesson.images.forEach((img, i) => {
      setTimeout(() => {
        const a = document.createElement("a");
        a.href = blobDownloadUrl(img.url);
        a.download = "";
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }, i * 250);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/agent/training" className="text-sm text-muted hover:text-foreground">
          &larr; Back to Training
        </Link>
        <div className="flex items-center gap-3">
          {navigation.position && (
            <span className="font-condensed text-xs font-bold tracking-[0.1em] text-muted uppercase">
              Lesson {navigation.position} of {navigation.total}
            </span>
          )}
          <div className="flex gap-2">
            <Button variant="ghost" disabled={!prevHref} onClick={() => prevHref && router.push(prevHref)}>
              &larr; Prev
            </Button>
            <Button variant="ghost" disabled={!nextHref} onClick={() => nextHref && router.push(nextHref)}>
              Next &rarr;
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div>
            <p className="font-condensed text-[11px] font-bold tracking-[0.14em] text-copper uppercase">
              {lesson.moduleTitle}
            </p>
            <CardTitle>{lesson.title}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {lesson.images.length > 0 && (
              <Button variant="ghost" onClick={downloadImages}>
                <Download className="h-4 w-4" />
                {lesson.images.length > 1 ? "Download Photos" : "Download Photo"}
              </Button>
            )}
            <Button
              variant={completed ? "success" : "secondary"}
              disabled={saving}
              onClick={toggleComplete}
            >
              {completed ? "Completed ✓" : "Mark Complete"}
            </Button>
          </div>
        </CardHeader>

        {lesson.description && <p className="mb-4 text-sm text-muted">{lesson.description}</p>}

        {embedUrl && (
          <div className="aspect-video w-full overflow-hidden rounded-lg border border-border">
            <iframe
              src={embedUrl}
              title={lesson.title}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {!embedUrl && lesson.videoUrl && (
          <div className="rounded-lg border border-border bg-surface2 p-6 text-center">
            <p className="mb-3 text-sm text-muted">This video can&apos;t be embedded automatically.</p>
            <a href={lesson.videoUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary">Open Training</Button>
            </a>
          </div>
        )}

        {lesson.images.length > 0 && (
          <div className={(embedUrl || lesson.videoUrl ? "mt-4 " : "") + "grid grid-cols-2 gap-2 sm:grid-cols-3"}>
            {lesson.images.map((img) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={img.id}
                src={img.url}
                alt=""
                onClick={() => setLightbox(img.url)}
                className="aspect-square w-full cursor-zoom-in rounded-lg border border-border object-cover"
              />
            ))}
          </div>
        )}

        {!embedUrl && !lesson.videoUrl && lesson.images.length === 0 && (
          <p className="text-sm text-muted">No content has been added to this lesson yet.</p>
        )}
      </Card>

      <p className="text-center text-xs text-muted">Tip: use the &larr; and &rarr; arrow keys to move between lessons.</p>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
          <button
            type="button"
            onClick={() => setLightbox(null)}
            aria-label="Close"
            className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
