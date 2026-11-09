import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireAdmin } from "@/lib/apiAuth";
import { TRAINING_VIDEO_MAX_BYTES, TRAINING_VIDEO_TYPES } from "@/lib/training";

export const dynamic = "force-dynamic";

/**
 * Training lesson video uploads go straight from the admin's browser to
 * Blob storage (this route only ever hands back a short-lived client
 * token) — same reasoning as the Announcements video upload route: a
 * lesson video can easily exceed the ~4.5MB body limit a Vercel
 * serverless function would otherwise impose if the bytes routed through
 * it. Lets an admin upload a video directly (e.g. one they don't have a
 * YouTube/Vimeo/Loom link for) instead of only pasting an external URL.
 */
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error:
          "File storage isn't configured yet — BLOB_READ_WRITE_TOKEN is missing.",
      },
      { status: 500 },
    );
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [...TRAINING_VIDEO_TYPES],
        maximumSizeInBytes: TRAINING_VIDEO_MAX_BYTES,
        addRandomSuffix: true,
        // The default token window (1 hour) can run out mid-transfer for a
        // large file on a slow connection — at 3GB that's a real
        // possibility, and an expired token makes the upload silently
        // stall rather than fail with a clear error. Six hours comfortably
        // covers even a very slow upload of the largest allowed file.
        validUntil: Date.now() + 6 * 60 * 60 * 1000,
      }),
    });
    return NextResponse.json(jsonResponse);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed." },
      { status: 400 },
    );
  }
}
