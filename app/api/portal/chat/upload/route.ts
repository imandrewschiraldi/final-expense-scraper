import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { CHAT_IMAGE_MAX_BYTES, CHAT_IMAGE_TYPES } from "@/lib/chat";

export const dynamic = "force-dynamic";

/**
 * Uploads one chat image to Blob storage and hands back its URL. Not itself
 * channel-gated — the message it gets attached to is checked when the actual
 * POST /messages happens, same as any other message body would be. An
 * uploaded-but-never-attached image just sits unused, which is fine.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (!CHAT_IMAGE_TYPES.includes(file.type as (typeof CHAT_IMAGE_TYPES)[number])) {
    return NextResponse.json({ error: "Only PNG, JPEG, GIF, or WebP images are allowed" }, { status: 400 });
  }
  if (file.size > CHAT_IMAGE_MAX_BYTES) {
    return NextResponse.json({ error: "That image is too large (8MB max)" }, { status: 400 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "File storage isn't configured yet — BLOB_READ_WRITE_TOKEN is missing." },
      { status: 500 },
    );
  }

  const blob = await put(`chat-images/${session.user.id}-${Date.now()}-${file.name}`, file, {
    access: "public",
  });

  return NextResponse.json({ url: blob.url });
}
