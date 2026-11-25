"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/apiAuth";
import { setPageLayoutBetaEnabled } from "@/lib/agencySettings";

// A Server Function (not a fetch()-based Route Handler) specifically so
// calling it purges every already-prefetched page's Router Cache entry on
// this client, not just the current one — see "Revalidating all data" in
// node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md.
// Every sidebar link is visible on screen, so Next.js silently prefetches
// (and caches client-side) the shared layout — sidebar, AppShell, this very
// flag — for every one of them the moment the page first loads, well before
// an admin ever reaches Profile to flip this switch. A plain PATCH route
// only marks the *server's* cache stale for the next request; it doesn't
// touch those already-cached client entries, so every other page the admin
// had open or had looked at kept serving its stale, pre-toggle snapshot of
// the whole shell forever — never correcting itself, on every single page
// change, until a hard refresh. revalidatePath("/", "layout") called from a
// Server Function is what actually clears that.
export async function togglePageLayoutBetaAction(enabled: boolean) {
  const guard = await requireAdmin();
  if ("error" in guard) {
    throw new Error("Forbidden");
  }
  await setPageLayoutBetaEnabled(enabled);
  revalidatePath("/", "layout");
}
