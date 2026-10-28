"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";

type Contact = { id: string; label: string; phone: string };
type Link = { id: string; label: string; url: string; isAgentPortal: boolean };
type Carrier = { id: string; name: string; contacts: Contact[]; links: Link[] };

/** Strips everything but digits/leading + so a display-formatted phone number (e.g. "800-231-0801") still works as a tel: link. */
function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function CarrierResourcesGrid() {
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Deep link from the sidebar's global search ("type a carrier, land on
  // their card") — ?carrier=<id> scrolls that card into view and briefly
  // rings it once the list has loaded.
  const searchParams = useSearchParams();
  const targetId = searchParams.get("carrier");
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const refs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    fetch("/api/portal/carrier-resources")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load carrier resources");
        return res.json();
      })
      .then((data) => setCarriers(data.carriers ?? []))
      .catch(() => setError("Failed to load carrier resources."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!targetId || carriers.length === 0) return;
    const el = refs.current[targetId];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlighted(targetId);
    const t = setTimeout(() => setHighlighted(null), 2000);
    return () => clearTimeout(t);
  }, [targetId, carriers]);

  if (loading) return <p className="text-sm text-muted">Loading...</p>;
  if (error) return <p className="text-sm text-red-light">{error}</p>;
  if (carriers.length === 0) {
    return <p className="text-sm text-muted">No carrier resources have been added yet.</p>;
  }

  // When the last row has a lone leftover carrier (odd total count), span
  // it across both columns and center it instead of leaving it stuck on
  // the left.
  const isTrailingOdd = (i: number) => carriers.length % 2 === 1 && i === carriers.length - 1;

  return (
    <div className="grid grid-cols-1 justify-center gap-x-14 gap-y-8 lg:grid-cols-[repeat(2,24rem)]">
      {carriers.map((carrier, i) => (
        <div
          key={carrier.id}
          id={`carrier-${carrier.id}`}
          ref={(el) => {
            refs.current[carrier.id] = el;
          }}
          className={cn("mx-auto w-full max-w-sm scroll-mt-24", isTrailingOdd(i) && "lg:col-span-2")}
        >
          <h2 className="font-montserrat mb-3 text-center text-2xl font-black tracking-wide text-white uppercase">
            {carrier.name}
          </h2>

          <div
            className={cn(
              "metal-copper-card rounded-lg p-5 transition-shadow",
              highlighted === carrier.id && "ring-2 ring-white",
            )}
          >
            {carrier.contacts.length > 0 && (
              <div className="mb-4 space-y-2 text-center">
                {carrier.contacts.map((contact) => (
                  <div key={contact.id}>
                    <p className="font-condensed text-xs font-bold tracking-[0.1em] text-white/90 uppercase drop-shadow-[0_1px_1px_rgba(0,0,0,0.55)]">
                      {contact.label}:
                    </p>
                    <a
                      href={telHref(contact.phone)}
                      className="text-lg font-extrabold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.55)] hover:underline"
                    >
                      {contact.phone}
                    </a>
                  </div>
                ))}
              </div>
            )}

            {carrier.links.length > 0 && (
              <div className="space-y-2">
                {carrier.links.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "font-condensed block rounded-md px-4 py-3 text-center text-sm font-bold tracking-[0.05em] uppercase transition-all active:translate-y-px",
                      link.isAgentPortal
                        ? "bg-[#ffffff] text-copper-dim shadow-[0_3px_6px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.9)] hover:bg-[#ffffff]/90"
                        : "metal-copper-surface text-white hover:brightness-110",
                    )}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
