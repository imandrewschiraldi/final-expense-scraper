// A from-scratch multipart uploader built on @vercel/blob's low-level
// primitives instead of its own `upload()`. The high-level call has no
// way to recover from a single part hanging partway through a
// multi-GB file other than scrapping the whole transfer and starting
// over from 0% — and on some networks (confirmed happening on both
// desktop and mobile for this app), that keeps happening repeatedly.
// Here, each 8MB part gets its own stall watch, reset by real byte
// progress (so a slow-but-moving connection is never flagged, only one
// that's gone completely silent); a part that stalls is retried on its
// own a few times before anything else is touched, so a bad patch of
// network costs at most one part's progress, not the whole file's.
import { createMultipartUploader } from "@vercel/blob/client";

const PART_SIZE = 8 * 1024 * 1024;
const PART_STALL_MS = 15000;
const MAX_PART_ATTEMPTS = 4;

function abortError(): DOMException {
  return new DOMException("The user aborted a request.", "AbortError");
}

// @vercel/blob's own `upload()` does this same handshake internally to
// turn a `handleUploadUrl` into a usable client token, but it's not
// exposed as a standalone call — the low-level primitives used below
// (`createMultipartUploader` etc.) expect an already-resolved token
// instead. This is the client-side half of that same handshake
// (matching the `blob.generate-client-token` event our server route
// already handles via `handleUpload()`), done by hand so we can use
// the lower-level, per-part-retryable upload calls.
async function fetchClientToken(
  pathname: string,
  handleUploadUrl: string,
  abortSignal: AbortSignal,
): Promise<string> {
  const res = await fetch(handleUploadUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: "blob.generate-client-token",
      payload: { pathname, clientPayload: null, multipart: true },
    }),
    signal: abortSignal,
  });
  if (!res.ok) {
    throw new Error("Couldn't start the upload — the server refused it.");
  }
  const data = (await res.json()) as { clientToken?: string };
  if (!data.clientToken) {
    throw new Error("Couldn't start the upload — no token came back.");
  }
  return data.clientToken;
}

export async function uploadTrainingVideo(
  file: File,
  {
    handleUploadUrl,
    abortSignal,
    onProgress,
  }: {
    handleUploadUrl: string;
    abortSignal: AbortSignal;
    onProgress: (pct: number) => void;
  },
): Promise<{ url: string }> {
  const totalParts = Math.max(1, Math.ceil(file.size / PART_SIZE));

  const token = await fetchClientToken(file.name, handleUploadUrl, abortSignal);
  if (abortSignal.aborted) throw abortError();

  let completedBytes = 0;
  let currentAttemptLoaded = 0;
  let lastProgressAt = Date.now();

  function reportProgress() {
    const loaded = completedBytes + currentAttemptLoaded;
    onProgress(file.size > 0 ? Math.min(100, (loaded / file.size) * 100) : 100);
  }

  // The public type for this call doesn't list `onUploadProgress` (only
  // the per-call standalone `uploadPart` export's type does) — but the
  // uploader object's `.uploadPart` reuses these same options under the
  // hood for every part's request, and does read it off them at
  // runtime (confirmed by reading the SDK source). The cast below is
  // just working around that type gap, not routing around a real one.
  const uploader = await createMultipartUploader(file.name, {
    access: "public",
    contentType: file.type || "video/mp4",
    token,
    abortSignal,
    onUploadProgress: ({ loaded }: { loaded: number }) => {
      currentAttemptLoaded = loaded;
      lastProgressAt = Date.now();
      reportProgress();
    },
  } as Parameters<typeof createMultipartUploader>[1]);

  const parts: { partNumber: number; etag: string }[] = [];

  for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
    if (abortSignal.aborted) throw abortError();

    const start = (partNumber - 1) * PART_SIZE;
    const blob = file.slice(start, Math.min(start + PART_SIZE, file.size));

    let lastError: unknown = null;
    let succeeded = false;

    for (
      let attempt = 1;
      attempt <= MAX_PART_ATTEMPTS && !succeeded;
      attempt++
    ) {
      if (abortSignal.aborted) throw abortError();

      currentAttemptLoaded = 0;
      lastProgressAt = Date.now();
      let settled = false;

      const attemptPromise = uploader
        .uploadPart(partNumber, blob)
        .then((result) => {
          settled = true;
          return result;
        });

      // Polls rather than a single setTimeout so a part that's still
      // genuinely moving keeps pushing this back indefinitely — only
      // actual silence for the full window trips it.
      const stallWatcher = new Promise<never>((_, reject) => {
        const interval = setInterval(() => {
          if (settled) {
            clearInterval(interval);
            return;
          }
          if (Date.now() - lastProgressAt > PART_STALL_MS) {
            clearInterval(interval);
            reject(new Error(`Part ${partNumber} of ${totalParts} stalled.`));
          }
        }, 1000);
      });

      try {
        const result = await Promise.race([attemptPromise, stallWatcher]);
        parts.push({ partNumber, etag: result.etag });
        completedBytes += blob.size;
        currentAttemptLoaded = 0;
        reportProgress();
        succeeded = true;
      } catch (err) {
        lastError = err;
        if (err instanceof DOMException && err.name === "AbortError") {
          throw err;
        }
        // Otherwise fall through and retry this same part — the
        // abandoned attempt's request is left to die on its own rather
        // than aborted, since this uploader's one shared abortSignal is
        // reserved for an actual user cancel (aborting it here would
        // kill every future part too, not just this stuck one).
      }
    }

    if (!succeeded) {
      throw lastError instanceof Error
        ? lastError
        : new Error("This upload stalled repeatedly and couldn't recover.");
    }
  }

  parts.sort((a, b) => a.partNumber - b.partNumber);
  const blob = await uploader.complete(parts);
  return { url: blob.url };
}
