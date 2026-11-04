"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export function BuyerAuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const rawNext = params.get("next") ?? "/shop";
  // Only allow redirects back into the shop.
  const next = rawNext.startsWith("/shop") ? rawNext : "/shop";
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch(`/api/shop/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form)),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong. Please try again.");
      return;
    }
    router.push(next);
    router.refresh();
  }

  const input = "w-full rounded-lg border border-border bg-input-bg px-3 py-2.5 text-white";
  return (
    <div className="mx-auto w-full max-w-[420px] rounded-[12px] border border-border bg-surface p-6">
      <h1 className="font-condensed text-2xl font-bold tracking-[0.04em] text-white uppercase">
        {mode === "signup" ? "Create your buyer account" : "Log in to buy leads"}
      </h1>
      <p className="mt-1 mb-5 text-sm text-muted">
        {mode === "signup"
          ? "Anyone can buy. Your account keeps your order history and lets you re-download your CSVs."
          : "Welcome back."}
      </p>
      <form onSubmit={onSubmit} className="flex flex-col gap-3.5">
        {mode === "signup" && (
          <div>
            <label htmlFor="buyer-name" className="mb-1 block text-xs text-muted">
              Name or agency
            </label>
            <input id="buyer-name" name="name" required autoComplete="organization" className={input} />
          </div>
        )}
        <div>
          <label htmlFor="buyer-email" className="mb-1 block text-xs text-muted">
            Email
          </label>
          <input id="buyer-email" name="email" type="email" required autoComplete="email" className={input} />
        </div>
        <div>
          <label htmlFor="buyer-password" className="mb-1 block text-xs text-muted">
            Password{mode === "signup" && " (8+ characters)"}
          </label>
          <input
            id="buyer-password"
            name="password"
            type="password"
            required
            minLength={mode === "signup" ? 8 : undefined}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            className={input}
          />
        </div>
        {error && <p className="text-sm text-red-light">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="btn-metal-copper font-condensed mt-1 rounded-lg py-3 text-base font-bold tracking-[0.08em] uppercase disabled:opacity-50"
        >
          {busy ? "One moment…" : mode === "signup" ? "Create account" : "Log in"}
        </button>
      </form>
      <p className="mt-4 text-sm text-muted">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <Link href={`/shop/login?next=${encodeURIComponent(next)}`} className="text-copper hover:underline">
              Log in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href={`/shop/signup?next=${encodeURIComponent(next)}`} className="text-copper hover:underline">
              Create an account
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
