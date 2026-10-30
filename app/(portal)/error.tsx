"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

/** Catches a render-time crash anywhere under the portal shell (sidebar,
 *  header, and every page stay mounted around this boundary) and shows a
 *  recoverable screen instead of the blank/dead page Next's bare default
 *  leaves behind — the only thing standing between a bug in one page and
 *  someone's whole app going white on them. */
export default function PortalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Portal render error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <p className="font-condensed text-lg font-bold text-white">Something went wrong</p>
      <p className="max-w-sm text-sm text-muted">
        This page hit an error and couldn&apos;t load. Try again, or head back to the dashboard.
      </p>
      <div className="flex gap-3">
        <Button onClick={reset}>Try Again</Button>
        <Button variant="ghost" onClick={() => (window.location.href = "/dashboard")}>
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
