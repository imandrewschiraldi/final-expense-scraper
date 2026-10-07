import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireAdmin } from "@/lib/apiAuth";
import { TRAINING_IMAGE_MAX_BYTES, TRAINING_IMAGE_TYPES } from "@/lib/training";

export const dynamic = "force-dynamic";

/**
 * Uploads one training-lesson photo to Blob storage and hands back its URL —
 * same shape as the chat image upload. Not tied to a specific lesson at
 * upload time (a lesson being created doesn't have an id yet), so an
 * uploaded-but-never-saved image just sits unused, same tradeoff as chat.
 */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (!TRAINING_IMAGE_TYPES.includes(file.type as (typeof TRAINING_IMAGE_TYPES)[number])) {
    return NextResponse.json({ error: "Only PNG, JPEG, GIF, or WebP images are allowed" }, { status: 400 });
  }
  if (file.size > TRAINING_IMAGE_MAX_BYTES) {
    return NextResponse.json({ error: "That image is too large (8MB max)" }, { status: 400 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "File storage isn't configured yet — BLOB_READ_WRITE_TOKEN is missing." },
      { status: 500 },
    );
  }

  const blob = await put(`training-images/${guard.session.user.id}-${Date.now()}-${file.name}`, file, {
    access: "public",
  });

  return NextResponse.json({ url: blob.url });
}
