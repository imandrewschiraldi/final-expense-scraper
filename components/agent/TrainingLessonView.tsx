"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { getEmbedUrl } from "@/lib/videoEmbed";

type Lesson = {
  id: string;
  title: string;
  description: string | null;
  videoUrl: string;
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

  const prevHref = navigation.prevId ? `/agent/training/lessons/${navigation.prevId}` : null;
  const nextHref = navigation.nextId ? `/agent/training/lessons/${navigation.nextId}` : null;
  const embedUrl = getEmbedUrl(lesson.videoUrl);

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
          <Button
            variant={completed ? "success" : "secondary"}
            disabled={saving}
            onClick={toggleComplete}
          >
            {completed ? "Completed ✓" : "Mark Complete"}
          </Button>
        </CardHeader>

        {lesson.description && <p className="mb-4 text-sm text-muted">{lesson.description}</p>}

        {embedUrl ? (
          <div className="aspect-video w-full overflow-hidden rounded-lg border border-border">
            <iframe
              src={embedUrl}
              title={lesson.title}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-surface2 p-6 text-center">
            <p className="mb-3 text-sm text-muted">This video can&apos;t be embedded automatically.</p>
            <a href={lesson.videoUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary">Open Video</Button>
            </a>
          </div>
        )}
      </Card>

      <p className="text-center text-xs text-muted">Tip: use the &larr; and &rarr; arrow keys to move between lessons.</p>
    </div>
  );
}
