import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";

const MAX_TITLE = 120;
const YOUTUBE_HOSTS = ["youtube.com", "www.youtube.com", "youtu.be", "m.youtube.com"];
const ANNOUNCEMENT_TYPES = ["VIDEO", "IMAGE", "UPLOADED_VIDEO", "PDF"] as const;
// UPLOADED_VIDEO/PDF have no built-in thumbnail source (no YouTube API, and
// the file itself isn't an image), so the client generates one and sends it
// along as a data URL — too large to validate byte-for-byte here, but a
// sanity check that it's actually an image data URL and not something else
// entirely.
const DATA_IMAGE_URL_PREFIX = "data:image/";

function isYoutubeUrl(value: string) {
  try {
    const { hostname } = new URL(value);
    return YOUTUBE_HOSTS.includes(hostname);
  } catch {
    return false;
  }
}

export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const items = await db.announcementItem.findMany({
    orderBy: { order: "asc" },
  });

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const body = await req.json().catch(() => null);
  const type = ANNOUNCEMENT_TYPES.includes(body?.type) ? body.type : null;
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, MAX_TITLE) : "";
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  const thumbnailUrl = typeof body?.thumbnailUrl === "string" ? body.thumbnailUrl.trim() : "";

  if (!type) return NextResponse.json({ error: "type must be VIDEO, IMAGE, UPLOADED_VIDEO, or PDF." }, { status: 400 });
  if (!title) return NextResponse.json({ error: "Title is required." }, { status: 400 });
  if (!url) return NextResponse.json({ error: "A URL is required." }, { status: 400 });
  if (type === "VIDEO" && !isYoutubeUrl(url)) {
    return NextResponse.json({ error: "That doesn't look like a YouTube link." }, { status: 400 });
  }
  if ((type === "UPLOADED_VIDEO" || type === "PDF") && !thumbnailUrl.startsWith(DATA_IMAGE_URL_PREFIX)) {
    return NextResponse.json({ error: "A generated thumbnail is required for an uploaded video or PDF." }, { status: 400 });
  }

  const last = await db.announcementItem.findFirst({ orderBy: { order: "desc" }, select: { order: true } });

  const item = await db.announcementItem.create({
    data: {
      type,
      title,
      url,
      thumbnailUrl: thumbnailUrl || null,
      order: (last?.order ?? 0) + 1,
      createdById: guard.session.user.id,
    },
  });

  return NextResponse.json({ item });
}

export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const body = await req.json().catch(() => null);

  // Full reorder: an array of every item's id in the desired order.
  if (Array.isArray(body?.reorder)) {
    const ids = body.reorder.filter((id: unknown): id is string => typeof id === "string");
    await db.$transaction(ids.map((id: string, index: number) => db.announcementItem.update({ where: { id }, data: { order: index } })));
    return NextResponse.json({ ok: true });
  }

  // Single-item toggle.
  const id = typeof body?.id === "string" ? body.id : null;
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });
  if (typeof body?.active !== "boolean") {
    return NextResponse.json({ error: "active must be a boolean." }, { status: 400 });
  }

  const item = await db.announcementItem.update({ where: { id }, data: { active: body.active } });
  return NextResponse.json({ item });
}

export async function DELETE(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const body = await req.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : null;
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  await db.announcementItem.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
