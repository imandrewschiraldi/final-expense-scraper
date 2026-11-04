const DIRECT_VIDEO_EXTENSIONS = [
  ".mp4",
  ".webm",
  ".mov",
  ".m4v",
  ".ogv",
  ".ogg",
];

/** True for a link that points straight at a video file — an upload to
 *  Blob storage or any other plain file host — rather than a page on a
 *  platform like YouTube. Those render with a native `<video>` element
 *  instead of an iframe embed; getEmbedUrl returns null for these since
 *  there's no provider page to build an embed URL from. */
export function isDirectVideoUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:")
      return false;
    const path = parsed.pathname.toLowerCase();
    return DIRECT_VIDEO_EXTENSIONS.some((ext) => path.endsWith(ext));
  } catch {
    return false;
  }
}

export function getEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = parsed.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      const shortsMatch = parsed.pathname.match(/^\/shorts\/([\w-]+)/);
      if (shortsMatch) return `https://www.youtube.com/embed/${shortsMatch[1]}`;
      return null;
    }

    if (host === "youtu.be") {
      const id = parsed.pathname.slice(1);
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    if (host === "vimeo.com") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }

    if (host === "loom.com") {
      const match = parsed.pathname.match(/^\/share\/([\w-]+)/);
      return match ? `https://www.loom.com/embed/${match[1]}` : null;
    }

    return null;
  } catch {
    return null;
  }
}
