import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireAdmin } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

const LIMITS: Record<string, { contentTypes: string[]; maxBytes: number }> = {
  image: { contentTypes: ["image/png", "image/jpeg", "image/gif", "image/webp"], maxBytes: 8 * 1024 * 1024 },
  video: { contentTypes: ["video/mp4", "video/webm", "video/quicktime"], maxBytes: 300 * 1024 * 1024 },
  pdf: { contentTypes: ["application/pdf"], maxBytes: 20 * 1024 * 1024 },
};

/**
 * Announcements file uploads go straight from the admin's browser to Blob
 * storage (this route only ever hands back a short-lived client token) —
 * video files in particular can easily exceed the ~4.5MB body limit a
 * Vercel serverless function would otherwise impose if the bytes routed
 * through it.
 */
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "File storage isn't configured yet — BLOB_READ_WRITE_TOKEN is missing." },
      { status: 500 },
    );
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayloadRaw) => {
        const clientPayload = (() => {
          try {
            return JSON.parse(clientPayloadRaw ?? "{}") as { kind?: string };
          } catch {
            return {};
          }
        })();
        const limit = LIMITS[clientPayload.kind ?? ""];
        if (!limit) throw new Error("Unknown upload kind.");
        return {
          allowedContentTypes: limit.contentTypes,
          maximumSizeInBytes: limit.maxBytes,
          addRandomSuffix: true,
        };
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Upload failed." }, { status: 400 });
  }
}
