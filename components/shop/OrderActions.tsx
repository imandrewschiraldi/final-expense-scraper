"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function OrderActions({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function resend() {
    setState("sending");
    setError(null);
    const res = await fetch(`/api/shop/orders/${orderId}/resend`, { method: "POST" });
    if (res.ok) {
      setState("sent");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "The email didn't send.");
      setState("error");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-3 whitespace-nowrap">
        <a href={`/api/shop/orders/${orderId}/csv`} className="text-copper hover:underline">
          Download CSV
        </a>
        <button type="button" onClick={resend} disabled={state === "sending"} className="text-foreground hover:text-white">
          {state === "sending" ? "Sending…" : state === "sent" ? "Sent" : "Email again"}
        </button>
      </div>
      {error && <span className="text-xs text-red-light">{error}</span>}
    </div>
  );
}
