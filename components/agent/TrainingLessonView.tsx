"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Download, Link2, X } from "lucide-react";
import VimeoPlayerSdk from "@vimeo/player";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { getEmbedInfo, isDirectVideoUrl } from "@/lib/videoEmbed";
import { loadYoutubeIframeApi, type YTPlayer } from "@/lib/youtubeIframeApi";
import {
  formatCompactCount,
  type YoutubeChannelInfo,
} from "@/lib/youtubeChannel";
import { blobDownloadUrl } from "@/lib/training";

type Lesson = {
  id: string;
  title: string;
  description: string | null;
  videos: {
    id: string;
    url: string;
    thumbnailUrl: string | null;
    channelInfo: YoutubeChannelInfo | null;
  }[];
  images: { id: string; url: string }[];
  moduleId: string;
  moduleTitle: string;
  chapterId: string;
  chapterTitle: string;
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

/** A whole YouTube channel link rendered as its real channel header —
 *  banner, avatar, name, handle, subscriber/video counts — instead of a
 *  bare hostname, using live data from the YouTube Data API (see
 *  lib/youtubeChannel.ts). The whole card is the link, so the decorative
 *  "Subscribe" button opens the real channel the same as anywhere else
 *  on it — there's no way to actually subscribe without YouTube's own
 *  OAuth, so this hands that off to YouTube itself rather than faking it. */
function YoutubeChannelCard({
  info,
  onOpened,
}: {
  info: YoutubeChannelInfo;
  onOpened: () => void;
}) {
  const stats = [
    info.subscriberCount != null
      ? `${formatCompactCount(info.subscriberCount)} subscribers`
      : null,
    info.videoCount != null
      ? `${formatCompactCount(info.videoCount)} videos`
      : null,
  ].filter(Boolean);

  return (
    <a
      href={info.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onOpened}
      className="block overflow-hidden rounded-lg border border-border bg-surface2 transition-colors hover:border-copper-dim-gradient"
    >
      <div className="h-16 w-full sm:h-20">
        {info.bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={info.bannerUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="h-full w-full"
            style={{
              backgroundImage:
                "linear-gradient(135deg, rgb(202 126 64 / 0.3) 0%, rgb(172 90 42 / 0.2) 45%, rgb(20 10 5 / 0.95) 100%)",
            }}
          />
        )}
      </div>
      <div className="flex items-start gap-3 p-3">
        <div className="-mt-8 h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-surface2 bg-surface">
          {info.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={info.avatarUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-white/30">
              <Link2 className="h-6 w-6" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 pt-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {info.title}
          </p>
          <p className="truncate text-xs text-muted">
            {[info.handle, ...stats].filter(Boolean).join(" · ")}
          </p>
        </div>
        <Button variant="secondary" className="mt-1 shrink-0">
          Subscribe
        </Button>
      </div>
    </a>
  );
}

/** Resolves one of a lesson's video links to whatever can actually be
 *  done with it — a tracked embed, a native file player, a live YouTube
 *  channel header, or (anything else that isn't a single playable
 *  video) a plain "Open Link" card. `onFinished`/`onOpened` only ever
 *  fires for the one that actually applies; the lesson view decides
 *  which of those this link needs satisfied before it counts. */
function VideoEntry({
  url,
  title,
  thumbnailUrl,
  channelInfo,
  onFinished,
  onOpened,
}: {
  url: string;
  title: string;
  thumbnailUrl: string | null;
  channelInfo: YoutubeChannelInfo | null;
  onFinished: () => void;
  onOpened: () => void;
}) {
  const embedInfo = getEmbedInfo(url);
  const directVideo = !embedInfo && isDirectVideoUrl(url) ? url : null;

  if (directVideo) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-lg border border-border bg-black">
        <DirectVideoPlayer
          src={directVideo}
          title={title}
          onEnded={onFinished}
        />
      </div>
    );
  }

  if (embedInfo?.platform === "youtube") {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-lg border border-border bg-black">
        <YoutubePlayer
          videoId={embedInfo.videoId}
          title={title}
          onEnded={onFinished}
        />
      </div>
    );
  }

  if (embedInfo?.platform === "vimeo") {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-lg border border-border">
        <VimeoPlayer
          embedUrl={embedInfo.embedUrl}
          title={title}
          onEnded={onFinished}
        />
      </div>
    );
  }

  if (embedInfo?.platform === "loom") {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-lg border border-border">
        <LoomPlayer
          embedUrl={embedInfo.embedUrl}
          title={title}
          onEnded={onFinished}
        />
      </div>
    );
  }

  if (channelInfo) {
    return <YoutubeChannelCard info={channelInfo} onOpened={onOpened} />;
  }

  // Not a single playable video — a whole YouTube channel to follow, a
  // playlist, or any other link that can't be embedded automatically.
  // There's no "finished" for something with no end, so this only ever
  // needs to have been opened once, same as a photo.
  let label = url;
  try {
    label = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    // Keep the raw url as the label if it somehow doesn't parse.
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onOpened}
      className="flex items-center gap-3 rounded-lg border border-border bg-surface2 p-3 transition-colors hover:border-copper-dim-gradient"
    >
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg">
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{
              backgroundImage:
                "linear-gradient(135deg, rgb(202 126 64 / 0.22) 0%, rgb(172 90 42 / 0.16) 45%, rgb(20 10 5 / 0.9) 100%)",
            }}
          >
            <Link2 className="h-5 w-5 text-white/25" strokeWidth={1.5} />
          </div>
        )}
      </div>
      <span className="min-w-0 flex-1 truncate text-sm text-teal-light">
        {label}
      </span>
      <Button variant="secondary" className="shrink-0">
        Open Link
      </Button>
    </a>
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
  const [finishedVideoIds, setFinishedVideoIds] = useState<Set<string>>(
    new Set(),
  );
  const [openedLinkIds, setOpenedLinkIds] = useState<Set<string>>(new Set());
  const [openedImageIds, setOpenedImageIds] = useState<Set<string>>(new Set());
  const completing = useRef(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const chapterHref = `/agent/training/modules/${lesson.moduleId}/chapters/${lesson.chapterId}`;
  const moduleHref = `/agent/training/modules/${lesson.moduleId}`;

  const prevHref = navigation.prevId
    ? `/agent/training/lessons/${navigation.prevId}`
    : null;
  // navigation.nextId flows straight through every chapter in the module,
  // in order (see app/agent/training/lessons/[id]/page.tsx) — finishing
  // the last lesson of one chapter moves right into the next chapter's
  // first lesson instead of dropping back to a chapter picker. Only the
  // very last lesson of the whole module has nowhere further to go, and
  // "Next" from there goes back to that module's own chapter list instead.
  const isLastInModule = !navigation.nextId;
  const nextHref = navigation.nextId
    ? `/agent/training/lessons/${navigation.nextId}`
    : moduleHref;

  // A video resolves either to something trackable (a single playable
  // video — must finish) or, for a link with no single end to reach — a
  // whole YouTube channel to follow, say — just something that must have
  // been opened at least once, same as a photo.
  const trackableVideoIds = lesson.videos
    .filter((v) => Boolean(getEmbedInfo(v.url) || isDirectVideoUrl(v.url)))
    .map((v) => v.id);
  const linkOnlyVideoIds = lesson.videos
    .filter((v) => !trackableVideoIds.includes(v.id))
    .map((v) => v.id);
  const hasContent = lesson.videos.length > 0 || lesson.images.length > 0;

  // A lesson can carry several videos, photos, or both — completion
  // requires actually engaging with everything it has, not just one
  // piece of it.
  const videosSatisfied =
    trackableVideoIds.every((id) => finishedVideoIds.has(id)) &&
    linkOnlyVideoIds.every((id) => openedLinkIds.has(id));
  const photosSatisfied =
    lesson.images.length === 0 ||
    lesson.images.every((img) => openedImageIds.has(img.id));
  const earned = hasContent && videosSatisfied && photosSatisfied;

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

  function markVideoFinished(id: string) {
    setFinishedVideoIds((prev) =>
      prev.has(id) ? prev : new Set(prev).add(id),
    );
  }

  function markLinkOpened(id: string) {
    setOpenedLinkIds((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
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
    : trackableVideoIds.some((id) => !finishedVideoIds.has(id))
      ? "Finish every video to complete"
      : linkOnlyVideoIds.some((id) => !openedLinkIds.has(id))
        ? "Open every link to complete"
        : !photosSatisfied
          ? "Open every photo to complete"
          : "Not completed";

  return (
    <div className="space-y-6 pt-2 lg:pt-[70px]">
      <div className="flex items-center justify-between">
        <Link
          href={chapterHref}
          className="text-sm text-muted hover:text-foreground"
        >
          &larr; Back to {lesson.chapterTitle}
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
            <Button variant="ghost" onClick={() => router.push(nextHref)}>
              {isLastInModule ? "Finish Module →" : "Next →"}
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div>
            <p className="font-condensed metal-copper-text text-[11px] font-bold tracking-[0.14em] uppercase">
              {lesson.moduleTitle} &middot; {lesson.chapterTitle}
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

        {lesson.videos.length > 0 && (
          <div className="space-y-3">
            {lesson.videos.map((v) => (
              <VideoEntry
                key={v.id}
                url={v.url}
                title={lesson.title}
                thumbnailUrl={v.thumbnailUrl}
                channelInfo={v.channelInfo}
                onFinished={() => markVideoFinished(v.id)}
                onOpened={() => markLinkOpened(v.id)}
              />
            ))}
          </div>
        )}

        {lesson.images.length > 0 && (
          <div
            className={cn(
              lesson.videos.length > 0 && "mt-4",
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
