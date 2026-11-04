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
 *  instead of an iframe embed; getEmbedInfo returns null for these since
 *  there's no provider page to build an embed from. */
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

/**
 * Which provider a lesson's embeddable video is hosted on, and whatever
 * that provider's player needs to attach to it. The lesson view needs
 * more than just an embed URL: YouTube and Vimeo both have a real player
 * API that can block skipping ahead and report when a video actually
 * ends, and each one is wired up differently (YouTube's IFrame API wants
 * a bare video id so it can build its own iframe; Vimeo's Player SDK
 * attaches to an iframe this app already rendered). Loom has no such API
 * publicly, so it only ever needs the plain embed URL.
 */
export type EmbedInfo =
  | { platform: "youtube"; videoId: string }
  | { platform: "vimeo" | "loom"; embedUrl: string };

export function getEmbedInfo(url: string): EmbedInfo | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = parsed.searchParams.get("v");
      if (id) return { platform: "youtube", videoId: id };
      const shortsMatch = parsed.pathname.match(/^\/shorts\/([\w-]+)/);
      return shortsMatch
        ? { platform: "youtube", videoId: shortsMatch[1] }
        : null;
    }

    if (host === "youtu.be") {
      const id = parsed.pathname.slice(1);
      return id ? { platform: "youtube", videoId: id } : null;
    }

    if (host === "vimeo.com") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id
        ? {
            platform: "vimeo",
            embedUrl: `https://player.vimeo.com/video/${id}`,
          }
        : null;
    }

    if (host === "loom.com") {
      const match = parsed.pathname.match(/^\/share\/([\w-]+)/);
      return match
        ? {
            platform: "loom",
            embedUrl: `https://www.loom.com/embed/${match[1]}`,
          }
        : null;
    }

    return null;
  } catch {
    return null;
  }
}
