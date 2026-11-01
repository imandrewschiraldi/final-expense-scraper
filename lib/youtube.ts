/** Pulls the video id out of any common YouTube URL shape (watch?v=,
 *  youtu.be/, /embed/, /shorts/) so the Announcements carousel can build a
 *  thumbnail and embed URL from whatever link an admin pastes in. */
export function youtubeVideoId(url: string): string | null {
  try {
    const { hostname, pathname, searchParams } = new URL(url);
    if (hostname === "youtu.be") return pathname.slice(1) || null;
    if (!hostname.endsWith("youtube.com")) return null;
    const v = searchParams.get("v");
    if (v) return v;
    const match = pathname.match(/\/(embed|shorts)\/([^/?]+)/);
    return match ? match[2] : null;
  } catch {
    return null;
  }
}

export function youtubeThumbnailUrl(url: string): string | null {
  const id = youtubeVideoId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

export function youtubeEmbedUrl(url: string): string | null {
  const id = youtubeVideoId(url);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}
