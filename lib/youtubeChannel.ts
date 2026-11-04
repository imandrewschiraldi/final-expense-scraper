/**
 * Live YouTube channel data for a lesson link that points at a whole
 * channel rather than a single video (youtube.com/@handle,
 * /channel/UC..., or the legacy /user/Username) — the banner, avatar,
 * name, and subscriber/video counts, pulled from the YouTube Data API v3
 * so the "Open Link" card can look like a real channel header instead of
 * a bare hostname. Requires YOUTUBE_API_KEY; returns null without it (or
 * on any lookup failure) so the lesson view falls back to its plain
 * thumbnail card instead of breaking.
 */
export type YoutubeChannelInfo = {
  title: string;
  handle: string | null;
  description: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  subscriberCount: number | null;
  videoCount: number | null;
  url: string;
};

type ChannelRef =
  | { forHandle: string }
  | { id: string }
  | { forUsername: string };

/** A custom /c/Name URL isn't resolvable this way — the API has no
 *  lookup for it, only for a handle, a channel id, or a legacy username
 *  — so that case returns null and falls back to the plain card. */
function parseChannelRef(url: string): ChannelRef | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host !== "youtube.com" && host !== "m.youtube.com") return null;

    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length === 0) return null;

    if (segments[0].startsWith("@")) return { forHandle: segments[0] };
    if (segments[0] === "channel" && segments[1]) return { id: segments[1] };
    if (segments[0] === "user" && segments[1])
      return { forUsername: segments[1] };
    return null;
  } catch {
    return null;
  }
}

export async function getYoutubeChannelInfo(
  url: string,
): Promise<YoutubeChannelInfo | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return null;

  const ref = parseChannelRef(url);
  if (!ref) return null;

  const params = new URLSearchParams({
    part: "snippet,statistics,brandingSettings",
    key: apiKey,
  });
  if ("forHandle" in ref) params.set("forHandle", ref.forHandle);
  else if ("id" in ref) params.set("id", ref.id);
  else params.set("forUsername", ref.forUsername);

  let res: Response;
  try {
    res = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?${params}`,
      // Subscriber counts don't need to be real-time — cache for an hour
      // so a busy lesson page doesn't burn API quota on every view.
      { next: { revalidate: 3600 } },
    );
  } catch {
    return null;
  }
  if (!res.ok) return null;

  const data = await res.json().catch(() => null);
  const channel = data?.items?.[0];
  if (!channel) return null;

  const snippet = channel.snippet ?? {};
  const statistics = channel.statistics ?? {};
  // bannerExternalUrl has been unreliable/absent from the API response
  // for many channels since Google reworked channel branding — when it's
  // missing the card just falls back to a plain gradient banner.
  const bannerUrl: string | null =
    channel.brandingSettings?.image?.bannerExternalUrl ?? null;

  return {
    title: snippet.title ?? "YouTube channel",
    handle: snippet.customUrl
      ? snippet.customUrl.startsWith("@")
        ? snippet.customUrl
        : `@${snippet.customUrl}`
      : null,
    description: snippet.description ?? "",
    avatarUrl:
      snippet.thumbnails?.high?.url ?? snippet.thumbnails?.default?.url ?? null,
    bannerUrl,
    subscriberCount: statistics.hiddenSubscriberCount
      ? null
      : Number(statistics.subscriberCount ?? 0),
    videoCount:
      statistics.videoCount != null ? Number(statistics.videoCount) : null,
    url,
  };
}

export function formatCompactCount(n: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}
