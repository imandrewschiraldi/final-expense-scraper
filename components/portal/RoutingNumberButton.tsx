"use client";

import { useState } from "react";
import { Landmark } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

/**
 * A fixed-size pill button (matching People Search/KPI Tracker/etc. here
 * on Overview) that opens a popup to look up a bank's routing number —
 * the button itself never changes size or color, unlike the header's
 * "Ask Gemini" box this was first modeled on. Two separate fields (bank
 * name, city/ZIP) rather than one free-text box so there's no ambiguity
 * about what goes where. No link out to the agency's own Custom GPT by
 * design — this is meant to be the only way agents look this up, not a
 * detour to somewhere else.
 */
export function RoutingNumberButton() {
  const [open, setOpen] = useState(false);
  const [bankName, setBankName] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setOpen(false);
    setBankName("");
    setLocation("");
    setAnswer(null);
    setError(null);
  }

  async function ask() {
    if (!bankName.trim() || !location.trim() || loading) return;
    setLoading(true);
    setAnswer(null);
    setError(null);
    try {
      const res = await fetch("/api/portal/routing-number", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `${bankName.trim()}, ${location.trim()}`,
        }),
      });
      const data = await res.json();
      if (res.ok && data.answer) {
        setAnswer(data.answer);
      } else {
        setError(data.error ?? "Couldn't look that up. Try again.");
      }
    } catch {
      setError("Couldn't reach the AI assistant. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-condensed inline-flex shrink-0 items-center gap-2 rounded-full border border-border px-4 py-2 text-[13px] font-bold tracking-[0.08em] text-foreground uppercase transition-colors hover:border-copper-dim-gradient hover:text-white"
      >
        <Landmark className="h-4 w-4" />
        Routing Number Genie
      </button>

      <Modal
        open={open}
        onClose={handleClose}
        title="Routing Number Genie"
        maxWidthClassName="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Looks up a bank&apos;s routing number from a live search — always
            verify it with the bank directly before using it for a payment or
            draft.
          </p>

          <div>
            <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
              Bank Name
            </label>
            <Input
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g. Wells Fargo"
            />
          </div>
          <div>
            <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
              City or ZIP
            </label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Houston, TX"
            />
          </div>

          <Button
            variant="secondary"
            className="w-full"
            onClick={ask}
            disabled={!bankName.trim() || !location.trim() || loading}
          >
            {loading ? "Looking it up..." : "Search"}
          </Button>

          {error && <p className="text-sm text-red-light">{error}</p>}
          {answer && (
            <div className="rounded-[10px] border border-border bg-surface2 p-3 text-sm">
              <p className="whitespace-pre-wrap text-foreground">{answer}</p>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
