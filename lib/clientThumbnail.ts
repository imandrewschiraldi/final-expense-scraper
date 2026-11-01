"use client";

// Thumbnails for the two Announcements types that don't come with one for
// free (YouTube hands back a thumbnail URL from its video id; an uploaded
// image IS its own thumbnail) — generated entirely in the browser at upload
// time rather than server-side, since there's no video/PDF rendering
// available in this app's serverless functions. Both return a JPEG data URL
// small enough to store directly on the AnnouncementItem row.

const THUMBNAIL_MAX_DIMENSION = 480;
const THUMBNAIL_QUALITY = 0.82;

function canvasToJpegDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/jpeg", THUMBNAIL_QUALITY);
}

/** Draws one frame from partway into an uploaded video file onto a canvas. */
export function generateVideoThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    const url = URL.createObjectURL(file);
    video.src = url;

    function cleanup() {
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
    }

    video.onloadedmetadata = () => {
      // A couple seconds in (or halfway, for very short clips) tends to
      // avoid a black/blank opening frame without needing real scene
      // detection.
      video.currentTime = Math.min(2, (video.duration || 2) / 2);
    };

    video.onseeked = () => {
      try {
        const scale = Math.min(1, THUMBNAIL_MAX_DIMENSION / Math.max(video.videoWidth, video.videoHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas isn't supported in this browser.");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvasToJpegDataUrl(canvas);
        cleanup();
        resolve(dataUrl);
      } catch (err) {
        cleanup();
        reject(err instanceof Error ? err : new Error("Couldn't generate a video thumbnail."));
      }
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("Couldn't read that video file."));
    };
  });
}

/** Renders page 1 of an uploaded PDF onto a canvas, via pdfjs-dist. */
export async function generatePdfThumbnail(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: buffer });
  try {
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    const unscaled = page.getViewport({ scale: 1 });
    const scale = Math.min(THUMBNAIL_MAX_DIMENSION / unscaled.width, THUMBNAIL_MAX_DIMENSION / unscaled.height, 2);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas isn't supported in this browser.");

    await page.render({ canvasContext: ctx, viewport }).promise;
    return canvasToJpegDataUrl(canvas);
  } finally {
    await loadingTask.destroy();
  }
}
