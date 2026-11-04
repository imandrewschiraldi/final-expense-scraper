"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Download, X } from "lucide-react";
import VimeoPlayerSdk from "@vimeo/player";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { getEmbedInfo, isDirectVideoUrl } from "@/lib/videoEmbed";
import { loadYoutubeIframeApi, type YTPlayer } from "@/lib/youtubeIframeApi";
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

/** How far past the farthest point actually reached a seek is allowed to
 *  land before it's snapped back — small enough to not fight normal
 *  playback jitter or polling granularity, large enough that it isn't
 *  triggered by ordinary playback progressing between checks. */
const SEEK_TOLERANCE_SECONDS = 1.5;

/** A plain uploaded or directly-linked video file. Standard HTML5
 *  seek-ahead blocking: remember the farthest point actually reached
 *  during normal playback, and snap any seek past that back to it. This
 *  catches every way of seeking — scrubber drag, keyboard, a browser's
 *  own double-tap-to-skip — since they all surface as a `seeking` event.
 *
 *  Both `onTimeUpdate` and `onSeeking` call the same clamp function below
 *  rather than one tracking the max and the other enforcing it: on a
 *  paused video, `timeupdate` can fire with the already-jumped position
 *  before `seeking` does, so a handler that only ever advances `maxTime`
 *  (never checks it) would wave the jump through before the "enforcing"
 *  handler got a chance to catch it. Checking in both places is
 *  idempotent either way — whichever fires first with the jumped value
 *  reverts it, and the other then sees the already-corrected time. */
function DirectVideoPlayer({
  src,
  title,
  onEnded,
}: {
  src: string;
  title: string;
  onEnded: () => void;
}) {
  const maxTime = useRef(0);

  function clamp(video: HTMLVideoElement) {
    if (video.currentTime > maxTime.current + SEEK_TOLERANCE_SECONDS) {
      video.currentTime = maxTime.current;
    } else {
      maxTime.current = Math.max(maxTime.current, video.currentTime);
    }
  }

  return (
    <video
      src={src}
      controls
      className="h-full w-full"
      title={title}
      onTimeUpdate={(e) => clamp(e.currentTarget)}
      onSeeking={(e) => clamp(e.currentTarget)}
      onEnded={onEnded}
    >
      Your browser can&apos;t play this video.{" "}
      <a href={src} target="_blank" rel="noopener noreferrer">
        Download it instead.
      </a>
    </video>
  );
}

/** A YouTube embed, driven by the real IFrame Player API rather than a
 *  plain iframe. Built into a container div (not onto a React-rendered
 *  iframe) because the API replaces whatever element it's given with its
 *  own iframe — doing that to a div React merely owns the outside of is
 *  safe; doing it to an iframe React is actively rendering would fight
 *  React for ownership of that node. The API has no continuous
 *  time-update event, only state changes, so catching a seek means
 *  polling the current position while playing. */
function YoutubePlayer({
  videoId,
  title,
  onEnded,
}: {
  videoId: string;
  title: string;
  onEnded: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const maxTime = useRef(0);
  const onEndedRef = useRef(onEnded);
  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  useEffect(() => {
    let player: YTPlayer | null = null;
    let pollId: number | null = null;
    let cancelled = false;

    loadYoutubeIframeApi().then((YT) => {
      if (cancelled || !containerRef.current) return;
      player = new YT.Player(containerRef.current, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
          onStateChange: (e) => {
            if (e.data === YT.PlayerState.PLAYING) {
              if (pollId) window.clearInterval(pollId);
              pollId = window.setInterval(() => {
                if (!player) return;
                const t = player.getCurrentTime();
                if (t > maxTime.current + SEEK_TOLERANCE_SECONDS) {
                  player.seekTo(maxTime.current, true);
                } else {
                  maxTime.current = Math.max(maxTime.current, t);
                }
              }, 500);
            } else if (pollId) {
              window.clearInterval(pollId);
              pollId = null;
            }
            if (e.data === YT.PlayerState.ENDED) onEndedRef.current();
          },
        },
      });
    });

    return () => {
      cancelled = true;
      if (pollId) window.clearInterval(pollId);
      player?.destroy();
    };
  }, [videoId]);

  return <div ref={containerRef} title={title} className="h-full w-full" />;
}

/** A Vimeo embed. Unlike YouTube's API, Vimeo's Player SDK attaches to an
 *  existing iframe in place (it doesn't replace the element), so this one
 *  can stay a plain React-rendered iframe — same shape as the Loom one
 *  below, just with a player object layered on top of it. Vimeo fires a
 *  real `timeupdate`/`seeked` pair, so no polling is needed here. */
function VimeoPlayer({
  embedUrl,
  title,
  onEnded,
}: {
  embedUrl: string;
  title: string;
  onEnded: () => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const maxTime = useRef(0);
  const onEndedRef = useRef(onEnded);
  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  useEffect(() => {
    if (!iframeRef.current) return;
    const player = new VimeoPlayerSdk(iframeRef.current);

    // Same reasoning as DirectVideoPlayer's clamp: check-and-maybe-revert
    // in both the `timeupdate` and `seeked` handlers, rather than one
    // tracking and the other enforcing, so whichever fires first with an
    // already-jumped position is the one that catches it.
    function clamp(seconds: number) {
      if (seconds > maxTime.current + SEEK_TOLERANCE_SECONDS) {
        player.setCurrentTime(maxTime.current).catch(() => {});
      } else {
        maxTime.current = Math.max(maxTime.current, seconds);
      }
    }
    player.on("timeupdate", ({ seconds }) => clamp(seconds));
    player.on("seeked", ({ seconds }) => clamp(seconds));
    player.on("ended", () => onEndedRef.current());

    return () => {
      player.destroy().catch(() => {});
    };
  }, []);

  return (
    <iframe
      ref={iframeRef}
      src={embedUrl}
      title={title}
      className="h-full w-full"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  );
}

/** How long a Loom lesson has to stay open and actually visible (tab
 *  focused, not just loaded in a background tab) before it counts as
 *  watched. Loom has no public player API — no way to know real playback
 *  position, no way to block the scrubber, no duration to time this
 *  against — so this is a flat, deliberately modest floor rather than a
 *  true "watched to the end" signal, the one lesson type this app can't
 *  make a stronger promise about. */
const LOOM_MIN_WATCH_SECONDS = 60;

function LoomPlayer({
  embedUrl,
  title,
  onEnded,
}: {
  embedUrl: string;
  title: string;
  onEnded: () => void;
}) {
  const onEndedRef = useRef(onEnded);
  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  useEffect(() => {
    let elapsed = 0;
    let lastTick = Date.now();
    const id = window.setInterval(() => {
      const now = Date.now();
      if (document.visibilityState === "visible") {
        elapsed += (now - lastTick) / 1000;
      }
      lastTick = now;
      if (elapsed >= LOOM_MIN_WATCH_SECONDS) {
        onEndedRef.current();
        window.clearInterval(id);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <iframe
      src={embedUrl}
      title={title}
      className="h-full w-full"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  );
}

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
  const [videoEnded, setVideoEnded] = useState(false);
  const [openedImageIds, setOpenedImageIds] = useState<Set<string>>(new Set());
  const completing = useRef(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const prevHref = navigation.prevId
    ? `/agent/training/lessons/${navigation.prevId}`
    : null;
  const nextHref = navigation.nextId
    ? `/agent/training/lessons/${navigation.nextId}`
    : null;
  const embedInfo = lesson.videoUrl ? getEmbedInfo(lesson.videoUrl) : null;
  const directVideo =
    !embedInfo && lesson.videoUrl && isDirectVideoUrl(lesson.videoUrl)
      ? lesson.videoUrl
      : null;
  const hasVideo = Boolean(embedInfo || directVideo);
  const hasContent = hasVideo || lesson.images.length > 0;

  // A lesson can carry a video, photos, or both — completion requires
  // actually engaging with everything it has, not just one of several
  // pieces. A video must finish (or, for Loom, stay open long enough —
  // see LoomPlayer); every photo must have been opened at least once.
  const videoSatisfied = !hasVideo || videoEnded;
  const photosSatisfied =
    lesson.images.length === 0 ||
    lesson.images.every((img) => openedImageIds.has(img.id));
  const earned = hasContent && videoSatisfied && photosSatisfied;

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

  // Completion is earned, not toggled — once the video's finished (or
  // every photo's been opened), the lesson marks itself done with no
  // button to click. completing.current just stops a double POST if this
  // effect re-runs before the first one's response lands.
  useEffect(() => {
    if (completed || !earned || completing.current) return;
    completing.current = true;
    fetch(`/api/agent/training/lessons/${lesson.id}/complete`, {
      method: "POST",
    })
      .then(() => {
        setCompleted(true);
        router.refresh();
      })
      .finally(() => {
        completing.current = false;
      });
  }, [completed, earned, lesson.id, router]);

  function openImage(id: string, url: string) {
    setLightbox(url);
    setOpenedImageIds((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
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

  const statusLabel = completed
    ? "Completed ✓"
    : hasVideo && !videoSatisfied
      ? "Finish the video to complete"
      : !photosSatisfied
        ? "Open every photo to complete"
        : "Not completed";

  return (
    <div className="space-y-6 pt-2 lg:pt-[70px]">
      <div className="flex items-center justify-between">
        <Link
          href="/agent/training"
          className="text-sm text-muted hover:text-foreground"
        >
          &larr; Back to Training
        </Link>
        <div className="flex items-center gap-3">
          {navigation.position && (
            <span className="font-condensed text-xs font-bold tracking-[0.1em] text-muted uppercase">
              Lesson {navigation.position} of {navigation.total}
            </span>
          )}
          <div className="flex gap-2">
            <Button
              variant="ghost"
              disabled={!prevHref}
              onClick={() => prevHref && router.push(prevHref)}
            >
              &larr; Prev
            </Button>
            <Button
              variant="ghost"
              disabled={!nextHref}
              onClick={() => nextHref && router.push(nextHref)}
            >
              Next &rarr;
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div>
            <p className="font-condensed metal-copper-text text-[11px] font-bold tracking-[0.14em] uppercase">
              {lesson.moduleTitle}
            </p>
            <CardTitle>{lesson.title}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {lesson.images.length > 0 && (
              <Button variant="ghost" onClick={downloadImages}>
                <Download className="h-4 w-4" />
                {lesson.images.length > 1
                  ? "Download Photos"
                  : "Download Photo"}
              </Button>
            )}
            <span
              className={cn(
                "font-condensed rounded-lg border px-3 py-2 text-xs font-bold tracking-wide uppercase",
                completed
                  ? "border-green/40 bg-green/15 text-green"
                  : "border-border bg-surface2 text-muted",
              )}
            >
              {statusLabel}
            </span>
          </div>
        </CardHeader>

        {lesson.description && (
          <p className="mb-4 text-sm text-muted">{lesson.description}</p>
        )}

        {directVideo && (
          <div className="aspect-video w-full overflow-hidden rounded-lg border border-border bg-black">
            <DirectVideoPlayer
              src={directVideo}
              title={lesson.title}
              onEnded={() => setVideoEnded(true)}
            />
          </div>
        )}

        {embedInfo?.platform === "youtube" && (
          <div className="aspect-video w-full overflow-hidden rounded-lg border border-border bg-black">
            <YoutubePlayer
              videoId={embedInfo.videoId}
              title={lesson.title}
              onEnded={() => setVideoEnded(true)}
            />
          </div>
        )}

        {embedInfo?.platform === "vimeo" && (
          <div className="aspect-video w-full overflow-hidden rounded-lg border border-border">
            <VimeoPlayer
              embedUrl={embedInfo.embedUrl}
              title={lesson.title}
              onEnded={() => setVideoEnded(true)}
            />
          </div>
        )}

        {embedInfo?.platform === "loom" && (
          <div className="aspect-video w-full overflow-hidden rounded-lg border border-border">
            <LoomPlayer
              embedUrl={embedInfo.embedUrl}
              title={lesson.title}
              onEnded={() => setVideoEnded(true)}
            />
          </div>
        )}

        {!embedInfo && !directVideo && lesson.videoUrl && (
          <div className="rounded-lg border border-border bg-surface2 p-6 text-center">
            <p className="mb-3 text-sm text-muted">
              This video can&apos;t be embedded automatically.
            </p>
            <a href={lesson.videoUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary">Open Training</Button>
            </a>
          </div>
        )}

        {lesson.images.length > 0 && (
          <div
            className={cn(
              hasVideo && "mt-4",
              "grid grid-cols-2 gap-2 sm:grid-cols-3",
            )}
          >
            {lesson.images.map((img) => (
              <div key={img.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt=""
                  onClick={() => openImage(img.id, img.url)}
                  className="aspect-square w-full cursor-zoom-in rounded-lg border border-border object-cover"
                />
                {!openedImageIds.has(img.id) && (
                  <span className="pointer-events-none absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-copper" />
                )}
              </div>
            ))}
          </div>
        )}

        {!hasContent && (
          <p className="text-sm text-muted">
            No content has been added to this lesson yet.
          </p>
        )}
      </Card>

      <p className="text-center text-xs text-muted">
        Tip: use the &larr; and &rarr; arrow keys to move between lessons.
      </p>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt=""
            className="max-h-full max-w-full rounded-lg object-contain"
          />
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
