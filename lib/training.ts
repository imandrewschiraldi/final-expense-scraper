// Mirrors lib/chat.ts's CHAT_IMAGE_* constraints — same limits, kept
// separate so the two features aren't coupled through a shared constant.
export const TRAINING_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const TRAINING_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
] as const;

// Mirrors the video limits the Announcements upload route already uses
// (app/api/admin/announcements/upload/route.ts) — a lesson video an admin
// uploads directly, rather than linking to YouTube/Vimeo/Loom/elsewhere.
export const TRAINING_VIDEO_MAX_BYTES = 300 * 1024 * 1024;
export const TRAINING_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

/** Vercel Blob public URLs serve inline (display in a new tab) by default.
 *  Appending this query param — the same transformation @vercel/blob's own
 *  SDK applies internally to produce its `downloadUrl` field — makes the
 *  browser download the file instead, so we don't need to persist a second
 *  URL per image just to support a download button. */
export function blobDownloadUrl(url: string): string {
  const u = new URL(url);
  u.searchParams.set("download", "1");
  return u.toString();
}
