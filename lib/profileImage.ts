const BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";

/** next/image throws a render-time error — not just a broken image, the
 *  whole page crashes — for any src whose hostname isn't in next.config.ts's
 *  images.remotePatterns. Every *new* profile picture upload goes through
 *  Vercel Blob and matches, but an older/legacy stored URL might not, so
 *  every avatar spot needs this check before handing a URL to next/image
 *  rather than trusting profileImageUrl is always safe to pass straight
 *  through. Returns null (treat as "no picture") for anything that doesn't
 *  match, including unparseable strings. */
export function optimizableImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
    if (!parsed.hostname.endsWith(BLOB_HOST_SUFFIX)) return null;
    return url;
  } catch {
    return null;
  }
}
