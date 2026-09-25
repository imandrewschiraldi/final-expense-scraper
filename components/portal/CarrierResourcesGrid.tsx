"use client";

import { useEffect, useState } from "react";
import { AccentCard } from "@/components/ui/Card";
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

  if (loading) return <p className="text-sm text-muted">Loading...</p>;
  if (error) return <p className="text-sm text-red-light">{error}</p>;
  if (carriers.length === 0) {
    return <p className="text-sm text-muted">No carrier resources have been added yet.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {carriers.map((carrier) => (
        <AccentCard key={carrier.id}>
          <h2 className="font-condensed mb-4 text-center text-xl font-extrabold tracking-wide text-white uppercase">
            {carrier.name}
          </h2>

          {carrier.contacts.length > 0 && (
            <div className="mb-4 space-y-2 text-center">
              {carrier.contacts.map((contact) => (
                <div key={contact.id}>
                  <p className="font-condensed text-[11px] font-bold tracking-[0.1em] text-muted uppercase">{contact.label}</p>
                  <a href={telHref(contact.phone)} className="text-base font-bold text-copper hover:underline">
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
                    "font-condensed block rounded-lg border-[1.5px] px-4 py-2 text-center text-[13px] font-bold tracking-[0.05em] uppercase transition-colors",
                    link.isAgentPortal
                      ? "border-copper bg-copper text-black hover:bg-copper/90"
                      : "border-copper-dim text-copper hover:border-copper hover:bg-copper/10",
                  )}
                >
                  {link.label}
                </a>
              ))}
            </div>
          )}
        </AccentCard>
      ))}
    </div>
  );
}
